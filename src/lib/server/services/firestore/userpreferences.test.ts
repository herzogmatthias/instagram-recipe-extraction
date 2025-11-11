/** @jest-environment node */

import type {
  FirebaseClientConfig,
  EncryptedSecrets,
  ModelPreference,
} from "@/models/UserPreferences";

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

var MockTimestamp:
  | (TimestampConstructor & {
      now: () => InstanceType<TimestampConstructor>;
      fromDate: (date: Date) => InstanceType<TimestampConstructor>;
    })
  | undefined;

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
  constructor(
    private readonly store: Map<string, T>,
    public readonly id: string
  ) {}

  async set(data: T, options?: { merge?: boolean }) {
    if (options?.merge) {
      const existing = this.store.get(this.id) ?? ({} as T);
      this.store.set(this.id, { ...existing, ...data });
      return;
    }
    this.store.set(this.id, data);
  }

  async update(data: Partial<T>) {
    const existing = this.store.get(this.id);
    if (!existing) {
      throw new Error(`Document ${this.id} does not exist`);
    }
    this.store.set(this.id, { ...existing, ...data });
  }

  async get() {
    return new MockDocumentSnapshot<T>(this.id, this.store.get(this.id));
  }

  async delete() {
    this.store.delete(this.id);
  }
}

class MockCollectionReference<T extends Record<string, unknown>> {
  private readonly store = new Map<string, T>();

  doc(id: string) {
    return new MockDocumentReference<T>(this.store, id);
  }

  reset() {
    this.store.clear();
  }
}

class MockFirestore {
  private readonly userpreferences = new MockCollectionReference();

  collection(name: string) {
    if (name === "userpreferences") {
      return this.userpreferences;
    }
    throw new Error(`Unknown collection: ${name}`);
  }

  settings() {
    // No-op for testing
  }

  reset() {
    this.userpreferences.reset();
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
  getUserPreferences,
  setClientConfig,
  setSecrets,
  setModelPreference,
  deleteSecret,
  deleteUserPreferences,
  __resetUserPreferencesForTests,
  DEFAULT_USER_ID,
} from "./userpreferences";

describe("userpreferences Firestore operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestore.reset();
    __resetUserPreferencesForTests();
  });

  describe("getUserPreferences", () => {
    it("returns null when document doesn't exist", async () => {
      const result = await getUserPreferences();
      expect(result).toBeNull();
    });

    it("returns null for custom uid when document doesn't exist", async () => {
      const result = await getUserPreferences("user-123");
      expect(result).toBeNull();
    });
  });

  describe("setClientConfig", () => {
    it("creates new document with client config", async () => {
      const config: FirebaseClientConfig = {
        apiKey: "test-api-key",
        authDomain: "test.firebaseapp.com",
        projectId: "test-project",
        storageBucket: "test.appspot.com",
        messagingSenderId: "123456",
        appId: "test-app-id",
        measurementId: "G-TEST",
        lastValidatedAt: "2025-11-11T09:00:00Z",
      };

      const result = await setClientConfig(config);

      expect(result.uid).toBe(DEFAULT_USER_ID);
      expect(result.clientConfig).toEqual(config);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("updates existing document with new client config", async () => {
      const initialConfig: FirebaseClientConfig = {
        apiKey: "old-api-key",
        authDomain: "old.firebaseapp.com",
        projectId: "old-project",
        storageBucket: "old.appspot.com",
        messagingSenderId: "111111",
        appId: "old-app-id",
      };

      await setClientConfig(initialConfig);

      const updatedConfig: FirebaseClientConfig = {
        apiKey: "new-api-key",
        authDomain: "new.firebaseapp.com",
        projectId: "new-project",
        storageBucket: "new.appspot.com",
        messagingSenderId: "222222",
        appId: "new-app-id",
        lastValidatedAt: "2025-11-11T10:00:00Z",
      };

      const result = await setClientConfig(updatedConfig);

      expect(result.clientConfig).toEqual(updatedConfig);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("supports custom uid", async () => {
      const config: FirebaseClientConfig = {
        apiKey: "test-api-key",
        authDomain: "test.firebaseapp.com",
        projectId: "test-project",
        storageBucket: "test.appspot.com",
        messagingSenderId: "123456",
        appId: "test-app-id",
      };

      const result = await setClientConfig(config, "user-456");

      expect(result.uid).toBe("user-456");
      expect(result.clientConfig).toEqual(config);
    });
  });

  describe("setSecrets", () => {
    it("creates new document with encrypted secrets", async () => {
      const secrets: EncryptedSecrets = {
        version: 1,
        dek_wrapped: "base64-wrapped-dek",
        items: {
          APIFY_API_KEY: {
            ct: "encrypted-apify",
            iv: "iv-apify",
            tag: "tag-apify",
            last4: "xyz1",
            lastValidatedAt: "2025-11-11T09:00:00Z",
          },
          GEMINI_API_KEY: {
            ct: "encrypted-gemini",
            iv: "iv-gemini",
            tag: "tag-gemini",
            last4: "abc2",
            lastValidatedAt: "2025-11-11T09:00:00Z",
          },
        },
        createdAt: "2025-11-11T09:00:00Z",
      };

      const result = await setSecrets(secrets);

      expect(result.uid).toBe(DEFAULT_USER_ID);
      expect(result.secrets).toEqual(secrets);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("updates existing document with new secrets", async () => {
      const initialSecrets: EncryptedSecrets = {
        version: 1,
        dek_wrapped: "old-dek",
        items: {
          APIFY_API_KEY: {
            ct: "old-encrypted",
            iv: "old-iv",
            tag: "old-tag",
            last4: "old1",
          },
        },
      };

      await setSecrets(initialSecrets);

      const updatedSecrets: EncryptedSecrets = {
        version: 1,
        dek_wrapped: "new-dek",
        items: {
          APIFY_API_KEY: {
            ct: "new-encrypted",
            iv: "new-iv",
            tag: "new-tag",
            last4: "new1",
          },
          GEMINI_API_KEY: {
            ct: "gemini-encrypted",
            iv: "gemini-iv",
            tag: "gemini-tag",
            last4: "gem2",
          },
        },
        rotatedAt: "2025-11-11T10:00:00Z",
      };

      const result = await setSecrets(updatedSecrets);

      expect(result.secrets).toEqual(updatedSecrets);
    });
  });

  describe("setModelPreference", () => {
    it("creates new document with model preference", async () => {
      const modelPref: ModelPreference = {
        geminiDefaultModel: "gemini-2.0-pro-exp-02-05",
        lastValidatedAt: "2025-11-11T09:00:00Z",
      };

      const result = await setModelPreference(modelPref);

      expect(result.uid).toBe(DEFAULT_USER_ID);
      expect(result.modelPreference).toEqual(modelPref);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("updates existing document with new model preference", async () => {
      const initialPref: ModelPreference = {
        geminiDefaultModel: "gemini-1.5-flash",
      };

      await setModelPreference(initialPref);

      const updatedPref: ModelPreference = {
        geminiDefaultModel: "gemini-2.0-pro-exp-02-05",
        lastValidatedAt: "2025-11-11T10:00:00Z",
      };

      const result = await setModelPreference(updatedPref);

      expect(result.modelPreference).toEqual(updatedPref);
    });
  });

  describe("deleteSecret", () => {
    it("removes specific secret from items", async () => {
      const secrets: EncryptedSecrets = {
        version: 1,
        dek_wrapped: "test-dek",
        items: {
          APIFY_API_KEY: {
            ct: "apify-encrypted",
            iv: "apify-iv",
            tag: "apify-tag",
            last4: "api1",
          },
          GEMINI_API_KEY: {
            ct: "gemini-encrypted",
            iv: "gemini-iv",
            tag: "gemini-tag",
            last4: "gem2",
          },
        },
      };

      await setSecrets(secrets);

      const result = await deleteSecret("APIFY_API_KEY");

      expect(result).not.toBeNull();
      expect(result!.secrets?.items.APIFY_API_KEY).toBeUndefined();
      expect(result!.secrets?.items.GEMINI_API_KEY).toBeDefined();
      expect(result!.secrets?.version).toBe(1);
      expect(result!.secrets?.dek_wrapped).toBe("test-dek");
    });

    it("returns null if document doesn't exist", async () => {
      const result = await deleteSecret("APIFY_API_KEY");
      expect(result).toBeNull();
    });

    it("returns null if secrets field doesn't exist", async () => {
      const config: FirebaseClientConfig = {
        apiKey: "test",
        authDomain: "test.com",
        projectId: "test",
        storageBucket: "test",
        messagingSenderId: "123",
        appId: "test",
      };

      await setClientConfig(config);

      const result = await deleteSecret("APIFY_API_KEY");
      expect(result).toBeNull();
    });
  });

  describe("deleteUserPreferences", () => {
    it("deletes entire document", async () => {
      const config: FirebaseClientConfig = {
        apiKey: "test",
        authDomain: "test.com",
        projectId: "test",
        storageBucket: "test",
        messagingSenderId: "123",
        appId: "test",
      };

      await setClientConfig(config);

      let prefs = await getUserPreferences();
      expect(prefs).not.toBeNull();

      await deleteUserPreferences();

      prefs = await getUserPreferences();
      expect(prefs).toBeNull();
    });
  });

  describe("complete workflow", () => {
    it("creates document with all fields incrementally", async () => {
      // Set client config
      const config: FirebaseClientConfig = {
        apiKey: "test-api-key",
        authDomain: "test.firebaseapp.com",
        projectId: "test-project",
        storageBucket: "test.appspot.com",
        messagingSenderId: "123456",
        appId: "test-app-id",
      };

      await setClientConfig(config);

      // Set secrets
      const secrets: EncryptedSecrets = {
        version: 1,
        dek_wrapped: "wrapped-dek",
        items: {
          APIFY_API_KEY: {
            ct: "encrypted",
            iv: "iv",
            tag: "tag",
            last4: "key1",
          },
        },
      };

      await setSecrets(secrets);

      // Set model preference
      const modelPref: ModelPreference = {
        geminiDefaultModel: "gemini-2.0-pro-exp-02-05",
      };

      await setModelPreference(modelPref);

      // Verify complete document
      const prefs = await getUserPreferences();

      expect(prefs).not.toBeNull();
      expect(prefs!.clientConfig).toEqual(config);
      expect(prefs!.secrets).toEqual(secrets);
      expect(prefs!.modelPreference).toEqual(modelPref);
      expect(prefs!.uid).toBe(DEFAULT_USER_ID);
      expect(prefs!.createdAt).toBeDefined();
      expect(prefs!.updatedAt).toBeDefined();
    });
  });
});
