import fs from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";

export type MediaType = "image" | "video";

export interface DownloadMediaOptions {
  filename?: string;
  timeoutMs?: number;
  maxBytes?: number;
}

export interface DownloadMediaResult {
  filePath: string;
  size: number;
  mimeType: string;
  mediaType: MediaType;
}

export type MediaDownloadErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "NETWORK_ERROR"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "FILE_TOO_LARGE"
  | "DOWNLOAD_FAILED"
  | "WRITE_FAILED";

export class MediaDownloadError extends Error {
  readonly code: MediaDownloadErrorCode;

  constructor(code: MediaDownloadErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.code = code;
    this.name = "MediaDownloadError";
    if (options?.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".heic", ".heif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm", ".avi", ".mpeg", ".mpg", ".mkv"]);

const IMAGE_MIME_PREFIX = "image/";
const VIDEO_MIME_PREFIX = "video/";

const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30_000;
export const MAX_GEMINI_MEDIA_BYTES = 20 * 1024 * 1024; // 20 MB Gemini limit

const MEDIA_TMP_DIR =
  process.env.MEDIA_TMP_DIR ?? path.join(tmpdir(), "instagram-recipe-extraction-media");

export function getMediaType(url: string, mimeType?: string | null): MediaType | null {
  const typeFromMime = inferFromMime(mimeType);
  if (typeFromMime) {
    return typeFromMime;
  }

  const extension = extractExtension(url);
  if (extension && IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }
  if (extension && VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }

  return null;
}

export async function downloadMedia(
  rawUrl: string,
  options?: DownloadMediaOptions
): Promise<DownloadMediaResult> {
  const url = parseMediaUrl(rawUrl);
  ensureHttpProtocol(url);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS
  );

  let response: Response;
  try {
    response = await fetch(url.toString(), { signal: controller.signal });
  } catch (error) {
    clearTimeout(timeout);
    throw new MediaDownloadError("NETWORK_ERROR", "Failed to download media", { cause: error });
  }
  clearTimeout(timeout);

  if (!response.ok || !response.body) {
    throw new MediaDownloadError(
      "DOWNLOAD_FAILED",
      `Failed to download media. HTTP ${response.status ?? "unknown"}`
    );
  }

  const mimeType = response.headers.get("content-type") ?? "application/octet-stream";
  const mediaType = getMediaType(url.toString(), mimeType);
  if (!mediaType) {
    throw new MediaDownloadError(
      "UNSUPPORTED_MEDIA_TYPE",
      `Unsupported media type for url ${url.toString()}`
    );
  }

  const maxBytes = options?.maxBytes ?? MAX_GEMINI_MEDIA_BYTES;
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (!Number.isNaN(contentLength) && contentLength > maxBytes) {
      throw new MediaDownloadError(
        "FILE_TOO_LARGE",
        `Media file exceeds maximum allowed size of ${maxBytes} bytes`
      );
    }
  }

  const targetDir = await ensureTempDir();
  const filename = createFilename(options?.filename, url);
  const filePath = path.join(targetDir, filename);

  try {
    const readable = toNodeReadable(response.body);
    await pipeline(readable, createSizeValidator(maxBytes), fs.createWriteStream(filePath));
  } catch (error) {
    await safeCleanup(filePath);
    if (error instanceof MediaDownloadError) {
      throw error;
    }
    throw new MediaDownloadError("WRITE_FAILED", "Failed to write media file", { cause: error });
  }

  const fileStats = await stat(filePath);
  if (fileStats.size > maxBytes) {
    await safeCleanup(filePath);
    throw new MediaDownloadError(
      "FILE_TOO_LARGE",
      `Media file exceeds maximum allowed size of ${maxBytes} bytes`
    );
  }

  return {
    filePath,
    size: fileStats.size,
    mimeType,
    mediaType,
  };
}

export async function cleanupMedia(filePath: string | undefined | null) {
  if (!filePath) {
    return;
  }

  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw new MediaDownloadError("WRITE_FAILED", `Failed to remove media file ${filePath}`, {
      cause: error,
    });
  }
}

function inferFromMime(mimeType?: string | null): MediaType | null {
  if (!mimeType) {
    return null;
  }
  if (mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    return "image";
  }
  if (mimeType.startsWith(VIDEO_MIME_PREFIX)) {
    return "video";
  }
  return null;
}

function extractExtension(url: string): string | null {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).toLowerCase();
    return ext || null;
  } catch {
    return null;
  }
}

function createFilename(preferredName: string | undefined, url: URL) {
  if (preferredName) {
    return sanitizeFilename(preferredName);
  }

  const extension = extractExtension(url.toString()) ?? "";
  return `${randomUUID()}${extension}`;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9._-]/gi, "_");
}

async function ensureTempDir() {
  const absoluteDir = path.isAbsolute(MEDIA_TMP_DIR)
    ? MEDIA_TMP_DIR
    : path.resolve(process.cwd(), MEDIA_TMP_DIR);
  await mkdir(absoluteDir, { recursive: true });
  return absoluteDir;
}

function parseMediaUrl(rawUrl: string) {
  try {
    return new URL(rawUrl);
  } catch {
    throw new MediaDownloadError("INVALID_URL", `Invalid media URL: ${rawUrl}`);
  }
}

function ensureHttpProtocol(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new MediaDownloadError(
      "UNSUPPORTED_PROTOCOL",
      `Unsupported protocol ${url.protocol ?? "unknown"}`
    );
  }
}

function toNodeReadable(
  body: NodeJS.ReadableStream | ReadableStream<Uint8Array> | null
): NodeJS.ReadableStream {
  if (!body) {
    throw new MediaDownloadError("DOWNLOAD_FAILED", "Response body is empty");
  }

  if (typeof (body as ReadableStream).getReader === "function") {
    return Readable.fromWeb(body as ReadableStream<Uint8Array>);
  }

  return body as NodeJS.ReadableStream;
}

function createSizeValidator(limit: number) {
  let bytesRead = 0;
  return new Transform({
    transform(chunk, _encoding, callback) {
      bytesRead += chunk.length;
      if (bytesRead > limit) {
        callback(
          new MediaDownloadError(
            "FILE_TOO_LARGE",
            `Media file exceeds maximum allowed size of ${limit} bytes`
          )
        );
        return;
      }
      callback(null, chunk);
    },
  });
}

async function safeCleanup(filePath: string) {
  try {
    await unlink(filePath);
  } catch {
    // Ignore cleanup failures for partial files.
  }
}
