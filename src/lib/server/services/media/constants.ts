import path from "node:path";
import { tmpdir } from "node:os";

export const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".heic",
  ".heif",
]);

export const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".m4v",
  ".webm",
  ".avi",
  ".mpeg",
  ".mpg",
  ".mkv",
]);

export const IMAGE_MIME_PREFIX = "image/";
export const VIDEO_MIME_PREFIX = "video/";

export const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30_000;
export const MAX_GEMINI_MEDIA_BYTES = 20 * 1024 * 1024; // 20 MB

export const MEDIA_TMP_DIR =
  process.env.MEDIA_TMP_DIR ??
  path.join(tmpdir(), "instagram-recipe-extraction-media");
