import { Readable } from "node:stream";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import type { MediaType } from "./types";
import { MediaDownloadError } from "./types";
import {
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  IMAGE_MIME_PREFIX,
  VIDEO_MIME_PREFIX,
  MEDIA_TMP_DIR,
} from "./constants";

export function getMediaType(
  url: string,
  mimeType?: string | null
): MediaType | null {
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

export function inferFromMime(mimeType?: string | null): MediaType | null {
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

export function extractExtension(url: string): string | null {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).toLowerCase();
    return ext || null;
  } catch {
    return null;
  }
}

export function createFilename(
  preferredName: string | undefined,
  url: URL
): string {
  if (preferredName) {
    return sanitizeFilename(preferredName);
  }

  const extension = extractExtension(url.toString()) ?? "";
  return `${randomUUID()}${extension}`;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9._-]/gi, "_");
}

export async function ensureTempDir(): Promise<string> {
  const absoluteDir = path.isAbsolute(MEDIA_TMP_DIR)
    ? MEDIA_TMP_DIR
    : path.resolve(process.cwd(), MEDIA_TMP_DIR);
  await mkdir(absoluteDir, { recursive: true });
  return absoluteDir;
}

export function parseMediaUrl(rawUrl: string): URL {
  try {
    return new URL(rawUrl);
  } catch {
    throw new MediaDownloadError("INVALID_URL", `Invalid media URL: ${rawUrl}`);
  }
}

export function ensureHttpProtocol(url: URL): void {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new MediaDownloadError(
      "UNSUPPORTED_PROTOCOL",
      `Unsupported protocol ${url.protocol ?? "unknown"}`
    );
  }
}

export function toNodeReadable(
  body: NodeJS.ReadableStream | ReadableStream<Uint8Array> | null
): NodeJS.ReadableStream {
  if (!body) {
    throw new MediaDownloadError("DOWNLOAD_FAILED", "Response body is empty");
  }

  if (typeof (body as ReadableStream).getReader === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Readable.fromWeb(body as any);
  }

  return body as NodeJS.ReadableStream;
}
