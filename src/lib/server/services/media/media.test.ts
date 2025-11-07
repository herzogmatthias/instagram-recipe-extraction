/** @jest-environment node */

import fs from "node:fs/promises";
import path from "node:path";

import {
  cleanupMedia,
  downloadMedia,
  getMediaType,
  MAX_GEMINI_MEDIA_BYTES,
  MediaDownloadError,
} from "./media";

const ORIGINAL_FETCH = global.fetch;

describe("media service", () => {
  const tempDir = path.join(process.cwd(), ".tmp-media-tests");

  beforeEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
    process.env.MEDIA_TMP_DIR = tempDir;
  });

  afterEach(async () => {
    global.fetch = ORIGINAL_FETCH;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("detects media type from mime and extension", () => {
    expect(getMediaType("https://cdn.example.com/photo.jpg")).toBe("image");
    expect(getMediaType("https://cdn.example.com/video.mp4")).toBe("video");
    expect(getMediaType("https://cdn.example.com/file.unknown", "video/mp4")).toBe("video");
  });

  it("downloads media to temporary directory", async () => {
    mockFetchResponse(Buffer.from("hello"), {
      "content-type": "image/jpeg",
      "content-length": "5",
    });

    const result = await downloadMedia("https://example.com/photo.jpg", {
      filename: "test-file.jpg",
    });

    expect(result.mediaType).toBe("image");
    expect(result.size).toBe(5);
    expect(result.filePath).toContain("test-file.jpg");

    const fileExists = await fileExistsAsync(result.filePath);
    expect(fileExists).toBe(true);
    await cleanupMedia(result.filePath);
  });

  it("rejects unsupported media types", async () => {
    mockFetchResponse(Buffer.from("hello"), {
      "content-type": "application/json",
      "content-length": "5",
    });

    await expect(downloadMedia("https://example.com/data.json")).rejects.toBeInstanceOf(
      MediaDownloadError
    );
  });

  it("rejects oversized files based on content-length header", async () => {
    mockFetchResponse(Buffer.from("hello"), {
      "content-type": "video/mp4",
      "content-length": String(MAX_GEMINI_MEDIA_BYTES + 1),
    });

    await expect(downloadMedia("https://example.com/clip.mp4")).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
    });
  });

  it("cleans up missing files without throwing", async () => {
    await expect(cleanupMedia(path.join(tempDir, "missing.mp4"))).resolves.toBeUndefined();
  });
});

function mockFetchResponse(body: Buffer, headers: Record<string, string>) {
  const response = new Response(body, {
    headers,
    status: 200,
  });
  global.fetch = jest.fn().mockResolvedValue(response) as typeof fetch;
}

async function fileExistsAsync(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
