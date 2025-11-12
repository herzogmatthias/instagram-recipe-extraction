import type { File as GeminiFile } from "@google/genai";
import { FileState } from "@google/genai";
import { getGeminiClient } from "./client";
import { GeminiUploadError, type UploadToGeminiOptions } from "./types";
import { DEFAULT_TIMEOUT_MS, DEFAULT_POLL_INTERVAL_MS } from "./client";

export async function uploadToGemini(
  filePath: string,
  mimeType: string,
  options?: UploadToGeminiOptions
): Promise<GeminiFile> {
  const client = await getGeminiClient();

  let uploaded: GeminiFile;
  try {
    uploaded = await client.files.upload({
      file: filePath,
      config: {
        mimeType,
        displayName: options?.displayName,
      },
    });
  } catch (error) {
    throw new GeminiUploadError(
      "UPLOAD_FAILED",
      "Failed to upload media to Gemini",
      {
        cause: error,
      }
    );
  }

  if (!uploaded.name) {
    throw new GeminiUploadError(
      "UPLOAD_FAILED",
      "Gemini upload did not return a file name"
    );
  }

  return waitForGeminiFile(uploaded.name, options);
}

export async function waitForGeminiFile(
  fileName: string,
  options?: UploadToGeminiOptions
): Promise<GeminiFile> {
  const client = await getGeminiClient();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollInterval = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const startTime = Date.now();

  while (true) {
    if (Date.now() - startTime > timeoutMs) {
      throw new GeminiUploadError(
        "TIMEOUT",
        "Timed out while waiting for Gemini to process file"
      );
    }

    let file: GeminiFile;
    try {
      file = await client.files.get({ name: fileName });
    } catch (error) {
      throw new GeminiUploadError(
        "UPLOAD_FAILED",
        "Failed to fetch Gemini file state",
        {
          cause: error,
        }
      );
    }

    if (file.state === FileState.ACTIVE) {
      return file;
    }

    if (file.state === FileState.FAILED) {
      throw new GeminiUploadError(
        "FAILED_PROCESSING",
        file.error?.message ?? "Gemini failed to process file"
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}
