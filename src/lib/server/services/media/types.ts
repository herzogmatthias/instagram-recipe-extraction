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

  constructor(
    code: MediaDownloadErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.code = code;
    this.name = "MediaDownloadError";
    if (options?.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}
