import fs from "node:fs";
import { stat, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import type { DownloadMediaOptions, DownloadMediaResult } from "./types";
import { MediaDownloadError } from "./types";
import {
  DEFAULT_DOWNLOAD_TIMEOUT_MS,
  MAX_GEMINI_MEDIA_BYTES,
} from "./constants";
import {
  getMediaType,
  parseMediaUrl,
  ensureHttpProtocol,
  ensureTempDir,
  createFilename,
  toNodeReadable,
} from "./utils";

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
    throw new MediaDownloadError("NETWORK_ERROR", "Failed to download media", {
      cause: error,
    });
  }
  clearTimeout(timeout);

  if (!response.ok || !response.body) {
    throw new MediaDownloadError(
      "DOWNLOAD_FAILED",
      `Failed to download media. HTTP ${response.status ?? "unknown"}`
    );
  }

  const mimeType =
    response.headers.get("content-type") ?? "application/octet-stream";
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
    await pipeline(
      readable,
      createSizeValidator(maxBytes),
      fs.createWriteStream(filePath)
    );
  } catch (error) {
    await safeCleanup(filePath);
    if (error instanceof MediaDownloadError) {
      throw error;
    }
    throw new MediaDownloadError("WRITE_FAILED", "Failed to write media file", {
      cause: error,
    });
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

export async function cleanupMedia(
  filePath: string | undefined | null
): Promise<void> {
  if (!filePath) {
    return;
  }

  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw new MediaDownloadError(
      "WRITE_FAILED",
      `Failed to remove media file ${filePath}`,
      {
        cause: error,
      }
    );
  }
}

function createSizeValidator(limit: number): Transform {
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

async function safeCleanup(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // Ignore cleanup failures for partial files.
  }
}
