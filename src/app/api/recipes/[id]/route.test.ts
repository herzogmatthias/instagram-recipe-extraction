/** @jest-environment node */

import { DELETE, GET } from "./route";
import { deleteRecipe, getRecipe } from "@/lib/server/services/firestore";

jest.mock("@/lib/server/services/firestore", () => ({
  getRecipe: jest.fn(),
  deleteRecipe: jest.fn(),
}));

const mockedGetRecipe = getRecipe as jest.MockedFunction<typeof getRecipe>;
const mockedDeleteRecipe = deleteRecipe as jest.MockedFunction<typeof deleteRecipe>;

function params(id: string) {
  return Promise.resolve({ id });
}

describe("/api/recipes/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a recipe when found", async () => {
    mockedGetRecipe.mockResolvedValue({
      id: "recipe-1",
      inputUrl: "https://www.instagram.com/reel/demo/",
      status: "ready",
    } as any);

    const response = await GET(new Request("http://localhost"), {
      params: params("recipe-1"),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("recipe-1");
  });

  it("returns 404 when recipe is not found", async () => {
    mockedGetRecipe.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost"), {
      params: params("missing"),
    });
    expect(response.status).toBe(404);
  });

  it("deletes a recipe", async () => {
    const response = await DELETE(new Request("http://localhost"), {
      params: params("recipe-1"),
    });
    expect(response.status).toBe(200);
    expect(mockedDeleteRecipe).toHaveBeenCalledWith("recipe-1");
  });
});
