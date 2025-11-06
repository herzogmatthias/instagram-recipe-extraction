/** @jest-environment node */

import { GET, POST } from "./route";
import { listRecipes } from "@/lib/server/services/firestore";

jest.mock("@/lib/server/services/firestore", () => ({
  listRecipes: jest.fn(),
}));

const mockedListRecipes = listRecipes as jest.MockedFunction<typeof listRecipes>;

describe("/api/recipes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns recipes with query parameters applied", async () => {
    mockedListRecipes.mockResolvedValue({
      recipes: [{ id: "1" }],
      nextCursor: "cursor",
    });

    const request = new Request(
      "http://localhost/api/recipes?status=ready&limit=5&sort=asc"
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ items: [{ id: "1" }], nextCursor: "cursor" });
    expect(mockedListRecipes).toHaveBeenCalledWith({
      status: "ready",
      sortDirection: "asc",
      cursor: undefined,
      limit: 5,
    });
  });

  it("returns 500 when Firestore query fails", async () => {
    mockedListRecipes.mockRejectedValue(new Error("boom"));
    const response = await GET(new Request("http://localhost/api/recipes"));
    expect(response.status).toBe(500);
  });

  it("returns 405 for POST requests", async () => {
    const response = await POST(new Request("http://localhost/api/recipes"));
    expect(response.status).toBe(405);
  });
});
