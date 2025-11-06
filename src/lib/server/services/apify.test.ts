/** @jest-environment node */

import { ApifyApiError } from "apify-client";
import type { InstagramRecipePost } from "@/models/InstagramRecipePost";
import {
  __resetApifyClientForTests,
  detectPostType,
  scrapeInstagramPost,
} from "./apify";

const mockActorCall = jest.fn();
const mockDatasetListItems = jest.fn();
const mockActor = jest.fn(() => ({ call: mockActorCall }));
const mockDataset = jest.fn(() => ({ listItems: mockDatasetListItems }));
const mockApifyClientConstructor = jest.fn(() => ({
  actor: mockActor,
  dataset: mockDataset,
}));

jest.mock("apify-client", () => {
  class MockApifyApiError extends Error {
    statusCode: number;
    attempt: number;
    type?: string;

    constructor(message: string, statusCode = 500, type?: string) {
      super(message);
      this.name = "ApifyApiError";
      this.statusCode = statusCode;
      this.attempt = 1;
      this.type = type;
    }
  }

  return {
    ApifyClient: jest.fn(() => mockApifyClientConstructor()),
    ApifyApiError: MockApifyApiError,
  };
});

describe("apify service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetApifyClientForTests();
    process.env.APIFY_API_KEY = "test-token";
    mockActorCall.mockResolvedValue({ defaultDatasetId: "dataset-1" });
    mockDatasetListItems.mockResolvedValue({ items: [createRawApifyPayload()] });
  });

  afterEach(() => {
    delete process.env.APIFY_API_KEY;
  });

  it("detects Instagram content type from URL", () => {
    expect(detectPostType("https://www.instagram.com/reel/abc/")).toBe("reel");
    expect(detectPostType("https://instagram.com/p/123")).toBe("post");
  });

  it("scrapes and returns Apify payload without extra parsing", async () => {
    const result = await scrapeInstagramPost({
      username: "chefbot",
      url: "https://www.instagram.com/reel/ABC123/",
    });

    expect(mockActor).toHaveBeenCalledWith("apify/instagram-reel-scraper");
    expect(mockActorCall).toHaveBeenCalledWith({
      runInput: { usernames: ["chefbot"], resultsLimit: 1 },
    });
    expect(result.shortCode).toBe("ABC123");
    expect(result.url).toBe("https://www.instagram.com/reel/ABC123/");
    expect(result.ownerUsername).toBe("chefbot");
    expect(result.latestComments).toHaveLength(1);
    expect(result.latestComments[0]?.ownerUsername).toBe("fan_1");
    expect(result.childPosts).toHaveLength(1);
    expect(result.childPosts[0]?.shortCode).toBe("CHILD1");
    expect(result.images).toContain("https://cdn.example.com/image-primary.jpg");
  });

  it("throws for invalid Instagram URLs", async () => {
    await expect(
      scrapeInstagramPost({ username: "chefbot", url: "notaurl" })
    ).rejects.toMatchObject({
      code: "INVALID_URL",
    });
  });

  it("throws PRIVATE_POST when Apify returns no items", async () => {
    mockDatasetListItems.mockResolvedValueOnce({ items: [] });

    await expect(
      scrapeInstagramPost({ username: "chefbot", url: "https://www.instagram.com/p/EMPTY/" })
    ).rejects.toMatchObject({
      code: "PRIVATE_POST",
    });
  });

  it("retries when Apify responds with rate limits", async () => {
    const payload = createRawApifyPayload({ shortCode: "RATE1" });
    mockActorCall
      .mockRejectedValueOnce(new ApifyApiError("rate limit", 429))
      .mockResolvedValueOnce({ defaultDatasetId: "dataset-2" });
    mockDatasetListItems.mockResolvedValueOnce({ items: [payload] });

    const result = await scrapeInstagramPost(
      { username: "chefbot", url: "https://instagram.com/reel/RATE1/" },
      { initialDelayMs: 0 }
    );

    expect(mockActorCall).toHaveBeenCalledTimes(2);
    expect(result.shortCode).toBe("RATE1");
  });

  it("throws when API key is missing", async () => {
    delete process.env.APIFY_API_KEY;
    await expect(
      scrapeInstagramPost({ username: "chefbot", url: "https://instagram.com/p/XYZ/" })
    ).rejects.toMatchObject({
      code: "TRANSIENT_ERROR",
    });
  });

  it("throws when username is missing", async () => {
    await expect(
      scrapeInstagramPost({ username: "", url: "https://instagram.com/p/XYZ/" })
    ).rejects.toMatchObject({
      code: "MISSING_USERNAME",
    });
  });
});

function createRawApifyPayload(
  overrides: Partial<InstagramRecipePost> = {}
): Record<string, unknown> {
  return {
    id: "123",
    shortCode: "ABC123",
    url: "https://www.instagram.com/reel/ABC123/",
    caption: "Tasty pasta #Dinner @ChefBot",
    hashtags: ["Dinner"],
    mentions: ["ChefBot"],
    images: ["https://cdn.example.com/image-primary.jpg"],
    videoUrl: "https://cdn.example.com/video.mp4",
    ownerUsername: "chefbot",
    ownerId: "owner-1",
    commentsCount: 1,
    latestComments: [
      {
        id: "c1",
        text: "Looks amazing!",
        ownerUsername: "fan_1",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    ],
    childPosts: [
      {
        id: "456",
        shortCode: "CHILD1",
        caption: "Child slide",
        ownerUsername: "chefbot",
        ownerId: "owner-1",
        images: ["https://cdn.example.com/child.jpg"],
      },
    ],
    ...overrides,
  };
}
