import { renderHook, waitFor } from "@testing-library/react";
import { useRecipePolling } from "../useRecipePolling";
import {
  InstagramRecipePost,
  RecipeStatus,
} from "@/models/InstagramRecipePost";
import { QueueItem } from "../useProcessingQueue";

// Mock fetch
global.fetch = jest.fn();

const createMockRecipe = (
  id: string,
  status: RecipeStatus
): InstagramRecipePost => ({
  inputUrl: `https://instagram.com/p/${id}`,
  id,
  type: "Image",
  shortCode: id,
  caption: "Test recipe",
  hashtags: [],
  mentions: [],
  url: `https://instagram.com/p/${id}`,
  commentsCount: 0,
  latestComments: [],
  images: [],
  likesCount: 0,
  timestamp: new Date().toISOString(),
  childPosts: [],
  ownerUsername: "testuser",
  ownerId: "123",
  isCommentsDisabled: false,
  status,
  progress: 50,
  createdAt: new Date().toISOString(),
});

const createMockQueueItem = (
  id: string,
  status: RecipeStatus,
  isPolling: boolean = true
): QueueItem => ({
  id,
  url: `https://instagram.com/p/${id}`,
  status,
  progress: 50,
  createdAt: new Date().toISOString(),
  isPolling,
});

describe("useRecipePolling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should not poll recipes with terminal status (ready)", () => {
    const queueItems = [createMockQueueItem("1", "ready")];

    renderHook(() =>
      useRecipePolling({
        queueItems,
        enabled: true,
      })
    );

    jest.runAllTimers();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("should not poll recipes with terminal status (failed)", () => {
    const queueItems = [createMockQueueItem("1", "failed")];

    renderHook(() =>
      useRecipePolling({
        queueItems,
        enabled: true,
      })
    );

    jest.runAllTimers();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("should poll recipes with non-terminal status", async () => {
    const queueItems = [createMockQueueItem("1", "queued")];
    const apiRecipe = createMockRecipe("1", "scraping");

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => apiRecipe,
    });

    renderHook(() =>
      useRecipePolling({
        queueItems,
        enabled: true,
      })
    );

    // Wait for initial poll
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/recipes/1");
    });
  });

  it("should call onStatusChange when status changes", async () => {
    const queueItems = [createMockQueueItem("1", "queued")];
    const onStatusChange = jest.fn();

    const updatedRecipe = {
      ...createMockRecipe("1", "queued"),
      status: "ready" as RecipeStatus,
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => updatedRecipe,
    });

    renderHook(() =>
      useRecipePolling({
        queueItems,
        onStatusChange,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith("1", "ready", updatedRecipe);
    });
  });

  it("should stop polling after reaching terminal status", async () => {
    const queueItems = [createMockQueueItem("1", "queued")];

    // First poll returns scraping, second returns ready
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...createMockRecipe("1", "queued"),
          status: "scraping",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...createMockRecipe("1", "queued"),
          status: "ready",
        }),
      });

    renderHook(() =>
      useRecipePolling({
        queueItems,
        enabled: true,
      })
    );

    // Wait for first poll
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Advance timers to trigger second poll
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    // Advance timers again - should not trigger another poll
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("should handle polling errors and call onError", async () => {
    const queueItems = [createMockQueueItem("1", "queued")];
    const onError = jest.fn();

    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    renderHook(() =>
      useRecipePolling({
        queueItems,
        onError,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("1", expect.any(Error));
    });
  });

  it("should continue polling after error with exponential backoff", async () => {
    const queueItems = [createMockQueueItem("1", "queued")];

    // First poll fails, second succeeds
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...createMockRecipe("1", "queued"),
          status: "scraping",
        }),
      });

    renderHook(() =>
      useRecipePolling({
        queueItems,
        enabled: true,
      })
    );

    // Wait for first poll (failed)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Advance timers for exponential backoff
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("should continue polling without a hard cap on consecutive errors", async () => {
    const queueItems = [createMockQueueItem("1", "queued")];

    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    renderHook(() =>
      useRecipePolling({
        queueItems,
        enabled: true,
      })
    );

    // Wait for first poll
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Advance timers for second poll
    jest.advanceTimersByTime(3000);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    // Advance timers for additional polls with backoff
    // With 1s initial and 1.5x backoff, we expect continued polling.
    // Assert at least one additional call (timing can vary under fake timers).
    jest.advanceTimersByTime(5000);
    await waitFor(() => {
      expect((fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("should not poll when disabled", () => {
    const queueItems = [createMockQueueItem("1", "queued")];

    renderHook(() =>
      useRecipePolling({
        queueItems,
        enabled: false,
      })
    );

    jest.runAllTimers();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("should poll multiple recipes independently", async () => {
    const queueItems = [
      createMockQueueItem("1", "queued"),
      createMockQueueItem("2", "scraping"),
    ];
    const recipes = [
      createMockRecipe("1", "queued"),
      createMockRecipe("2", "scraping"),
    ];

    (fetch as jest.Mock).mockImplementation((url: string) => {
      const id = url.split("/").pop();
      const recipe = recipes.find((r) => r.id === id);
      return Promise.resolve({
        ok: true,
        json: async () => recipe,
      });
    });

    renderHook(() =>
      useRecipePolling({
        queueItems,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/recipes/1");
      expect(fetch).toHaveBeenCalledWith("/api/recipes/2");
    });
  });

  it("should reset poll interval when status changes", async () => {
    const queueItems = [createMockQueueItem("1", "queued")];

    let callCount = 0;
    (fetch as jest.Mock).mockImplementation(() => {
      callCount++;
      const status = callCount === 1 ? "scraping" : "downloading_media";
      return Promise.resolve({
        ok: true,
        json: async () => ({ ...createMockRecipe("1", "queued"), status }),
      });
    });

    renderHook(() =>
      useRecipePolling({
        queueItems,
        enabled: true,
      })
    );

    // First poll
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // After status change, interval should reset to initial value (2s)
    // Add small delay to ensure promises resolve
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    jest.advanceTimersByTime(2100);

    await waitFor(
      () => {
        expect(fetch).toHaveBeenCalledTimes(2);
      },
      { timeout: 3000 }
    );
  });
});
