/** @jest-environment node */

import type { RecipeDocument } from "./firestore";
import type { RecipeImportDocument } from "@/models/RecipeImport";
import { processRecipeImport } from "./processor";
import { createRecipe, getImport, getRecipe, updateImport } from "./firestore";
import { scrapeInstagramPost } from "./apify";
import { cleanupMedia, downloadMedia } from "./media";
import { extractRecipe, uploadToGemini } from "./gemini";

jest.mock("./firestore", () => ({
  getImport: jest.fn(),
  updateImport: jest.fn(),
  createRecipe: jest.fn(),
  getRecipe: jest.fn(),
}));

jest.mock("./apify", () => ({
  scrapeInstagramPost: jest.fn(),
}));

jest.mock("./media", () => ({
  downloadMedia: jest.fn(),
  cleanupMedia: jest.fn(() => Promise.resolve()),
}));

jest.mock("./gemini", () => ({
  uploadToGemini: jest.fn(),
  extractRecipe: jest.fn(),
}));

const mockedGetImport = getImport as jest.MockedFunction<typeof getImport>;
const mockedUpdateImport = updateImport as jest.MockedFunction<
  typeof updateImport
>;
const mockedCreateRecipe = createRecipe as jest.MockedFunction<
  typeof createRecipe
>;
const mockedGetRecipe = getRecipe as jest.MockedFunction<typeof getRecipe>;
const mockedScrapeInstagramPost = scrapeInstagramPost as jest.MockedFunction<
  typeof scrapeInstagramPost
>;
const mockedDownloadMedia = downloadMedia as jest.MockedFunction<
  typeof downloadMedia
>;
const mockedCleanupMedia = cleanupMedia as jest.MockedFunction<
  typeof cleanupMedia
>;
const mockedUploadToGemini = uploadToGemini as jest.MockedFunction<
  typeof uploadToGemini
>;
const mockedExtractRecipe = extractRecipe as jest.MockedFunction<
  typeof extractRecipe
>;

const importTemplate: RecipeImportDocument = {
  id: "import-1",
  inputUrl: "https://www.instagram.com/reel/ABC123/",
  status: "queued",
  stage: "queued",
  progress: 0,
  metadata: { username: "chefbot" },
};

const scrapedPost = {
  id: "123",
  inputUrl: importTemplate.inputUrl,
  type: "Video",
  shortCode: "ABC123",
  caption: "Delicious pasta",
  hashtags: ["pasta"],
  mentions: [],
  url: "https://www.instagram.com/reel/ABC123/",
  commentsCount: 1,
  latestComments: [],
  images: ["https://cdn.example.com/image.jpg"],
  videoUrl: "https://cdn.example.com/video.mp4",
  childPosts: [],
  ownerUsername: "chefbot",
  ownerId: "owner-1",
  likesCount: 0,
  timestamp: new Date().toISOString(),
} as const;

const extractionResult = {
  recipe: {
    title: "Pasta",
    ingredients: [{ id: "ing-1", name: "Pasta" }],
    steps: [{ idx: 1, text: "Cook pasta", used_ingredients: ["ing-1"] }],
  },
  confidence: 0.9,
  rawText: "{}",
  issues: [],
};

const storedRecipe: RecipeDocument = {
  ...scrapedPost,
  id: "123",
  inputUrl: importTemplate.inputUrl,
  importId: importTemplate.id,
  geminiFileUri: "gs://files/test",
  recipe_data: extractionResult.recipe,
};

describe("jobOrchestrator", () => {
  let currentImport: RecipeImportDocument;

  beforeEach(() => {
    jest.resetAllMocks();
    currentImport = { ...importTemplate };
    mockedCleanupMedia.mockResolvedValue(undefined);
    mockedGetImport.mockImplementation(async () => ({ ...currentImport }));
    mockedUpdateImport.mockImplementation(async (_id, updates) => {
      Object.assign(currentImport, updates);
      if (updates?.metadata) {
        currentImport.metadata = updates.metadata;
      }
      return { ...currentImport };
    });
    mockedScrapeInstagramPost.mockResolvedValue(scrapedPost);
    mockedDownloadMedia.mockResolvedValue({
      filePath: "/tmp/video.mp4",
      size: 1024,
      mimeType: "video/mp4",
      mediaType: "video",
    });
    mockedUploadToGemini.mockResolvedValue({
      uri: "gs://files/test",
      name: "files/test",
    } as { uri: string });
    mockedExtractRecipe.mockResolvedValue(extractionResult);
    mockedCreateRecipe.mockResolvedValue(storedRecipe);
  });

  it("runs the full pipeline and returns the stored recipe", async () => {
    const result = await processRecipeImport(currentImport.id);

    expect(result).toEqual(storedRecipe);
    expect(mockedScrapeInstagramPost).toHaveBeenCalledWith({
      username: "chefbot",
      url: importTemplate.inputUrl,
    });
    expect(mockedDownloadMedia).toHaveBeenCalledWith(
      scrapedPost.videoUrl,
      expect.objectContaining({ filename: expect.stringContaining("ABC123") })
    );
    expect(mockedUploadToGemini).toHaveBeenCalledWith(
      "/tmp/video.mp4",
      "video/mp4",
      expect.any(Object)
    );
    expect(mockedExtractRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        geminiFileUri: "gs://files/test",
        caption: scrapedPost.caption,
      })
    );
    expect(mockedCreateRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        id: scrapedPost.id,
        geminiFileUri: "gs://files/test",
        recipe_data: extractionResult.recipe,
      })
    );
    expect(mockedCleanupMedia).toHaveBeenCalledWith("/tmp/video.mp4");
    expect(mockedUpdateImport).toHaveBeenCalledWith(
      currentImport.id,
      expect.objectContaining({ status: "ready" })
    );
  });

  it("returns existing recipe if import already finished", async () => {
    mockedGetImport.mockResolvedValue({
      ...importTemplate,
      status: "ready",
      stage: "ready",
      progress: 100,
      recipeId: "recipe-ready",
    });
    mockedGetRecipe.mockResolvedValue(storedRecipe);

    const result = await processRecipeImport(importTemplate.id);

    expect(result).toEqual(storedRecipe);
    expect(mockedScrapeInstagramPost).not.toHaveBeenCalled();
    expect(mockedGetRecipe).toHaveBeenCalledWith("recipe-ready");
  });

  it("marks import as failed when a stage throws", async () => {
    mockedDownloadMedia.mockRejectedValue(new Error("network error"));

    await expect(processRecipeImport(currentImport.id)).rejects.toThrow(
      /network error/i
    );

    expect(mockedUpdateImport).toHaveBeenCalledWith(
      currentImport.id,
      expect.objectContaining({ status: "failed", stage: "failed" })
    );
    expect(mockedCleanupMedia).toHaveBeenCalled();
  });
});
