/** @jest-environment node */

import type { RecipeStatus } from "@/models/InstagramRecipePost";

const mockInitializeApp = jest.fn(() => ({ name: "test-app" }));
const mockGetApps = jest.fn(() => []);
const mockCert = jest.fn((account) => account);

jest.mock("firebase-admin/app", () => ({
  getApps: () => mockGetApps(),
  initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
  cert: (...args: unknown[]) => mockCert(...args),
}));

type TimestampConstructor = new (date: Date) => {
  toDate: () => Date;
};

var MockTimestamp: (TimestampConstructor & {
  now: () => InstanceType<TimestampConstructor>;
  fromDate: (date: Date) => InstanceType<TimestampConstructor>;
}) | undefined;

function createTimestampStub() {
  return class TimestampStub {
    private readonly date: Date;

    constructor(date: Date) {
      this.date = date;
    }

    toDate() {
      return this.date;
    }

    static now() {
      return new TimestampStub(new Date(Date.now()));
    }

    static fromDate(date: Date) {
      return new TimestampStub(date);
    }
  };
}

type Direction = "asc" | "desc";

class MockDocumentSnapshot<T> {
  constructor(public readonly id: string, private readonly payload?: T) {}

  get exists() {
    return Boolean(this.payload);
  }

  data() {
    if (!this.payload) {
      return undefined;
    }
    return { ...(this.payload as Record<string, unknown>) } as T;
  }
}

class MockDocumentReference<T extends Record<string, unknown>> {
  constructor(private readonly store: Map<string, T>, public readonly id: string) {}

  async set(data: T, options?: { merge?: boolean }) {
    if (options?.merge) {
      const existing = this.store.get(this.id) ?? ({} as T);
      this.store.set(this.id, { ...existing, ...data });
      return;
    }
    this.store.set(this.id, data);
  }

  async get() {
    return new MockDocumentSnapshot<T>(this.id, this.store.get(this.id));
  }
}

class MockQuery<T extends Record<string, unknown>> {
  private limitSize?: number;

  constructor(
    private readonly store: Map<string, T>,
    private readonly field: string,
    private readonly direction: Direction,
  ) {}

  limit(size: number) {
    this.limitSize = size;
    return this;
  }

  async get() {
    const docs = Array.from(this.store.entries()).map(([id, data]) => new MockDocumentSnapshot<T>(id, data));
    const sorted = docs.sort((a, b) => {
      const aVal = extractComparable(a.data()?.[this.field]);
      const bVal = extractComparable(b.data()?.[this.field]);
      return this.direction === "desc" ? bVal - aVal : aVal - bVal;
    });
    const limited = typeof this.limitSize === "number" ? sorted.slice(0, this.limitSize) : sorted;
    return { docs: limited };
  }
}

class MockCollectionReference<T extends Record<string, unknown>> {
  constructor(private readonly store: Map<string, T>) {}

  doc(id?: string) {
    const docId = id ?? randomId();
    return new MockDocumentReference<T>(this.store, docId);
  }

  orderBy(field: string, direction: Direction) {
    return new MockQuery<T>(this.store, field, direction);
  }
}

class MockFirestore {
  private readonly collections = new Map<string, Map<string, Record<string, unknown>>>();

  collection<T extends Record<string, unknown>>(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return new MockCollectionReference<T>(this.collections.get(name)! as Map<string, T>);
  }

  reset() {
    this.collections.clear();
  }
}

const mockFirestore = new MockFirestore();
const mockGetFirestore = jest.fn(() => mockFirestore);

jest.mock("firebase-admin/firestore", () => {
  const Timestamp = createTimestampStub();
  MockTimestamp = Timestamp;
  return {
    getFirestore: () => mockGetFirestore(),
    Timestamp,
  };
});

import {
  __resetFirestoreForTests,
  createImport,
  createRecipe,
  getFirestore,
  getImport,
  getRecipe,
  listRecipes,
  updateImport,
} from "./firestore";
import type { RecipeUpsertInput } from "./firestore";

const baseRecipeFields = {
  caption: "Test caption",
  hashtags: ["#test"],
  mentions: [],
  url: "https://instagram.com/p/test",
  commentsCount: 0,
  latestComments: [],
  dimensionsHeight: 1080,
  dimensionsWidth: 1080,
  images: ["https://cdn.example.com/image.jpg"],
  videoUrl: null,
  likesCount: 0,
  timestamp: new Date("2024-01-01T00:00:00.000Z").toISOString(),
  childPosts: [],
  ownerUsername: "chefbot",
  ownerId: "owner-1",
  type: "Video",
  shortCode: "abc123",
} as const;

describe("firestore service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestore.reset();
    __resetFirestoreForTests();
  });

  it("initializes Firebase Admin only once", async () => {
    const serviceAccount = {
      projectId: "demo",
      clientEmail: "demo@example.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
    } satisfies Record<string, string>;

    process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(serviceAccount);

    await getFirestore();
    await getFirestore();

    expect(mockGetApps).toHaveBeenCalledTimes(1);
    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    expect(mockCert).toHaveBeenCalledWith(
      expect.objectContaining({ privateKey: expect.stringContaining("\n") }),
    );
    expect(mockGetFirestore).toHaveBeenCalledTimes(1);

    delete process.env.FIREBASE_SERVICE_ACCOUNT;
  });

  it("creates and retrieves imports with default values", async () => {
    const created = await createImport({ inputUrl: "https://instagram.com/p/demo" });

    expect(created.status).toBe("queued");
    expect(created.stage).toBe("queued");
    expect(created.progress).toBe(0);
    expect(created.metadata).toEqual({});

    const fetched = await getImport(created.id);
    expect(fetched).toEqual(created);
  });

  it("updates imports and clamps progress", async () => {
    const created = await createImport({ inputUrl: "https://instagram.com/p/demo" });

    const updated = await updateImport(created.id, {
      status: "scraping" as RecipeStatus,
      progress: 150,
      error: "Temporary",
    });

    expect(updated?.status).toBe("scraping");
    expect(updated?.progress).toBe(100);
    expect(updated?.error).toBe("Temporary");
  });

  it("creates recipes and lists them in descending order", async () => {
    const recipeA = await createRecipe(
      buildRecipeInput({
        createdAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        caption: "Recipe A",
      }),
    );
    const recipeB = await createRecipe(
      buildRecipeInput({
        createdAt: new Date("2024-02-01T00:00:00.000Z").toISOString(),
        caption: "Recipe B",
      }),
    );

    const all = await listRecipes();
    expect(all).toHaveLength(2);
    expect(all[0]?.caption).toBe("Recipe B");
    expect(all[1]?.caption).toBe("Recipe A");

    const fetched = await getRecipe(recipeA.id);
    expect(fetched?.caption).toBe("Recipe A");
  });
});

function buildRecipeInput(overrides: Partial<RecipeUpsertInput> = {}): RecipeUpsertInput {
  return { ...baseRecipeInput(), ...overrides };
}

function baseRecipeInput(): RecipeUpsertInput {
  return {
    ...baseRecipeFields,
    inputUrl: "https://instagram.com/p/test",
    recipe_data: {
      title: "Test",
      ingredients: [],
      steps: [],
    },
  };
}

function extractComparable(value: unknown) {
  if (!value) {
    return 0;
  }
  if (MockTimestamp && value instanceof MockTimestamp) {
    return value.toDate().getTime();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "string") {
    const date = Date.parse(value);
    return Number.isNaN(date) ? 0 : date;
  }
  return Number(value) || 0;
}

function randomId() {
  return Math.random().toString(36).slice(2, 12);
}
