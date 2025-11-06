/** @jest-environment node */

import { POST } from "./route";
import { createImport } from "@/lib/server/services/firestore";
import { processRecipeImport } from "@/lib/server/services/jobOrchestrator";

jest.mock("@/lib/server/services/firestore", () => ({
  createImport: jest.fn(),
}));

jest.mock("@/lib/server/services/jobOrchestrator", () => ({
  processRecipeImport: jest.fn(() => Promise.resolve()),
}));

const mockedCreateImport = createImport as jest.MockedFunction<typeof createImport>;
const mockedProcessImport =
  processRecipeImport as jest.MockedFunction<typeof processRecipeImport>;

describe("/api/recipes/import", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queues a recipe import when url and username are provided", async () => {
    mockedCreateImport.mockResolvedValue({
      id: "import-1",
      inputUrl: "https://www.instagram.com/reel/demo/",
      status: "queued",
      stage: "queued",
      progress: 0,
      metadata: { username: "chefbot" },
    });

    const request = new Request("http://localhost/api/recipes/import", {
      method: "POST",
      body: JSON.stringify({
        url: "https://www.instagram.com/reel/demo/",
        username: "chefbot",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe("import-1");
    expect(mockedCreateImport).toHaveBeenCalledWith({
      inputUrl: "https://www.instagram.com/reel/demo/",
      metadata: { username: "chefbot" },
    });
    expect(mockedProcessImport).toHaveBeenCalledWith("import-1");
  });

  it("returns 400 when url is missing", async () => {
    const request = new Request("http://localhost/api/recipes/import", {
      method: "POST",
      body: JSON.stringify({ username: "chefbot" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/missing instagram url/i);
  });

  it("returns 400 when username is missing", async () => {
    const request = new Request("http://localhost/api/recipes/import", {
      method: "POST",
      body: JSON.stringify({ url: "https://www.instagram.com/reel/demo/" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/username is required/i);
  });
});
