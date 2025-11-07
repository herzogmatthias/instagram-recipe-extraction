/** @jest-environment node */

import type { File as GeminiFile } from "@google/genai";
import {
  __resetGeminiClientForTests,
  extractRecipe,
  GeminiExtractionError,
  GeminiUploadError,
  uploadToGemini,
  waitForGeminiFile,
} from "./gemini";

const mockFilesModule = {
  upload: jest.fn(),
  get: jest.fn(),
};

const mockModelsModule = {
  generateContent: jest.fn(),
};

const mockGoogleGenAI = jest.fn(() => ({
  files: mockFilesModule,
  models: mockModelsModule,
}));

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn((...args) => mockGoogleGenAI(...args)),
  FileState: {
    PROCESSING: "PROCESSING",
    ACTIVE: "ACTIVE",
    FAILED: "FAILED",
  },
}));

const sampleRecipePayload = {
  recipe: {
    title: "Stovetop Meatballs",
    ingredients: [{ id: "ing-1", name: "Beef" }],
    steps: [{ idx: 1, text: "Mix ingredients", used_ingredients: ["ing-1"] }],
  },
};

describe("gemini service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetGeminiClientForTests();
    process.env.GEMINI_API_KEY = "test-key";
    mockFilesModule.upload.mockResolvedValue({
      name: "files/test",
      state: "PROCESSING",
    });
    mockFilesModule.get.mockResolvedValue({
      name: "files/test",
      state: "ACTIVE",
      uri: "gs://files/test",
    });
    mockModelsModule.generateContent.mockResolvedValue({
      text: JSON.stringify(sampleRecipePayload),
    });
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it("uploads media and waits for processing completion", async () => {
    const file = await uploadToGemini("/tmp/file.jpg", "image/jpeg");

    expect(mockFilesModule.upload).toHaveBeenCalledWith({
      file: "/tmp/file.jpg",
      config: { mimeType: "image/jpeg", displayName: undefined },
    });
    expect(file.state).toBe("ACTIVE");
  });

  it("throws when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(uploadToGemini("/tmp/file.jpg", "image/jpeg")).rejects.toMatchObject({
      code: "MISSING_API_KEY",
    });
  });

  it("throws when file processing fails", async () => {
    mockFilesModule.get.mockResolvedValueOnce({
      name: "files/test",
      state: "FAILED",
      error: { message: "processing error" },
    } satisfies GeminiFile);

    await expect(waitForGeminiFile("files/test")).rejects.toBeInstanceOf(GeminiUploadError);
  });

  it("times out when Gemini never activates the file", async () => {
    mockFilesModule.get.mockResolvedValue({
      name: "files/test",
      state: "PROCESSING",
    });

    await expect(
      waitForGeminiFile("files/test", { timeoutMs: 10, pollIntervalMs: 1 })
    ).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  it("extracts recipe JSON and validates structure", async () => {
    const result = await extractRecipe({
      geminiFileUri: "files/test",
      mediaMimeType: "image/jpeg",
      caption: "Tasty meal",
      hashtags: ["meatballs"],
    });

    expect(mockModelsModule.generateContent).toHaveBeenCalled();
    expect(result.recipe.title).toBe("Stovetop Meatballs");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("throws when Gemini returns invalid JSON", async () => {
    mockModelsModule.generateContent.mockResolvedValueOnce({
      text: "not json",
    });

    await expect(
      extractRecipe(
        {
          geminiFileUri: "files/test",
          mediaMimeType: "image/jpeg",
        },
        { maxAttempts: 1 }
      )
    ).rejects.toMatchObject({
      code: "INVALID_JSON",
    });
  });

  it("detects ambiguous recipe responses", async () => {
    mockModelsModule.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ recipes: [sampleRecipePayload.recipe, sampleRecipePayload.recipe] }),
    });

    await expect(
      extractRecipe(
        {
          geminiFileUri: "files/test",
          mediaMimeType: "image/jpeg",
        },
        { maxAttempts: 1 }
      )
    ).rejects.toBeInstanceOf(GeminiExtractionError);
  });

  it("fails validation when recipe lacks steps", async () => {
    mockModelsModule.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ recipe: { title: "Test", ingredients: [], steps: [] } }),
    });

    await expect(
      extractRecipe(
        {
          geminiFileUri: "files/test",
          mediaMimeType: "image/jpeg",
        },
        { maxAttempts: 1 }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });
});
