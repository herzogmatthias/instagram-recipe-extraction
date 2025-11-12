/**
 * Tests for readiness flags utility
 */

import { describe, it, expect } from "@jest/globals";
import {
  deriveReadinessFlags,
  getMissingConfigMessage,
  getSetupProgress,
} from "./readinessFlags";
import type { UserPreferencesDocument } from "@/models/UserPreferences";

describe("deriveReadinessFlags", () => {
  it("should return all false flags when preferences are null", () => {
    const flags = deriveReadinessFlags(null);

    expect(flags.uiReady).toBe(false);
    expect(flags.writeReady).toBe(false);
    expect(flags.extractionReady).toBe(false);
    expect(flags.isComplete).toBe(false);
    expect(flags.missing.clientConfig).toBe(true);
  });

  it("should set uiReady when client config is complete", () => {
    const preferences: UserPreferencesDocument = {
      clientConfig: {
        apiKey: "test-api-key",
        authDomain: "test.firebaseapp.com",
        projectId: "test-project",
        storageBucket: "test.appspot.com",
        messagingSenderId: "123456",
        appId: "1:123:web:abc",
        lastValidatedAt: new Date().toISOString(),
      },
    };

    const flags = deriveReadinessFlags(preferences);

    expect(flags.uiReady).toBe(true);
    expect(flags.writeReady).toBe(false);
    expect(flags.extractionReady).toBe(false);
    expect(flags.missing.clientConfig).toBeUndefined();
    expect(flags.missing.firebaseAdmin).toBe(true);
  });

  it("should set writeReady when client config and admin SDK are configured", () => {
    const preferences: UserPreferencesDocument = {
      clientConfig: {
        apiKey: "test-api-key",
        authDomain: "test.firebaseapp.com",
        projectId: "test-project",
        storageBucket: "test.appspot.com",
        messagingSenderId: "123456",
        appId: "1:123:web:abc",
        lastValidatedAt: new Date().toISOString(),
      },
      secrets: {
        version: 1,
        dek_wrapped: "wrapped-dek",
        items: {
          FIREBASE_SA_JSON: {
            ct: "encrypted",
            iv: "iv",
            tag: "tag",
            last4: "json",
            lastValidatedAt: new Date().toISOString(),
          },
        },
      },
    };

    const flags = deriveReadinessFlags(preferences);

    expect(flags.uiReady).toBe(true);
    expect(flags.writeReady).toBe(true);
    expect(flags.extractionReady).toBe(false);
    expect(flags.missing.firebaseAdmin).toBeUndefined();
    expect(flags.missing.apifyKey).toBe(true);
  });

  it("should set extractionReady when all services are configured", () => {
    const preferences: UserPreferencesDocument = {
      clientConfig: {
        apiKey: "test-api-key",
        authDomain: "test.firebaseapp.com",
        projectId: "test-project",
        storageBucket: "test.appspot.com",
        messagingSenderId: "123456",
        appId: "1:123:web:abc",
        lastValidatedAt: new Date().toISOString(),
      },
      secrets: {
        version: 1,
        dek_wrapped: "wrapped-dek",
        items: {
          FIREBASE_SA_JSON: {
            ct: "encrypted",
            iv: "iv",
            tag: "tag",
            last4: "json",
            lastValidatedAt: new Date().toISOString(),
          },
          APIFY_API_KEY: {
            ct: "encrypted",
            iv: "iv",
            tag: "tag",
            last4: "xyz1",
            lastValidatedAt: new Date().toISOString(),
          },
          GEMINI_API_KEY: {
            ct: "encrypted",
            iv: "iv",
            tag: "tag",
            last4: "abc2",
            lastValidatedAt: new Date().toISOString(),
          },
        },
      },
      modelPreference: {
        geminiDefaultModel: "gemini-1.5-flash",
        lastValidatedAt: new Date().toISOString(),
      },
    };

    const flags = deriveReadinessFlags(preferences);

    expect(flags.uiReady).toBe(true);
    expect(flags.writeReady).toBe(true);
    expect(flags.extractionReady).toBe(true);
    expect(flags.isComplete).toBe(true);
    expect(Object.keys(flags.missing).length).toBe(0);
  });

  it("should require model preference for extractionReady", () => {
    const preferences: UserPreferencesDocument = {
      clientConfig: {
        apiKey: "test-api-key",
        authDomain: "test.firebaseapp.com",
        projectId: "test-project",
        storageBucket: "test.appspot.com",
        messagingSenderId: "123456",
        appId: "1:123:web:abc",
        lastValidatedAt: new Date().toISOString(),
      },
      secrets: {
        version: 1,
        dek_wrapped: "wrapped-dek",
        items: {
          FIREBASE_SA_JSON: { ct: "e", iv: "i", tag: "t", last4: "json" },
          APIFY_API_KEY: { ct: "e", iv: "i", tag: "t", last4: "key1" },
          GEMINI_API_KEY: { ct: "e", iv: "i", tag: "t", last4: "key2" },
        },
      },
      // No modelPreference
    };

    const flags = deriveReadinessFlags(preferences);

    expect(flags.extractionReady).toBe(false);
    expect(flags.missing.modelPreference).toBe(true);
  });
});

describe("getMissingConfigMessage", () => {
  it("should return completion message when all flags are ready", () => {
    const flags = deriveReadinessFlags({
      clientConfig: {
        apiKey: "test",
        authDomain: "test.firebaseapp.com",
        projectId: "test",
        storageBucket: "test.appspot.com",
        messagingSenderId: "123",
        appId: "1:123:web:abc",
        lastValidatedAt: new Date().toISOString(),
      },
      secrets: {
        version: 1,
        dek_wrapped: "dek",
        items: {
          FIREBASE_SA_JSON: { ct: "e", iv: "i", tag: "t" },
          APIFY_API_KEY: { ct: "e", iv: "i", tag: "t" },
          GEMINI_API_KEY: { ct: "e", iv: "i", tag: "t" },
        },
      },
      modelPreference: {
        geminiDefaultModel: "gemini-1.5-flash",
        lastValidatedAt: new Date().toISOString(),
      },
    });

    const message = getMissingConfigMessage(flags);
    expect(message).toBe("Setup complete! All features are available.");
  });

  it("should list missing items when not complete", () => {
    const flags = deriveReadinessFlags(null);

    const message = getMissingConfigMessage(flags);
    expect(message).toContain("Firebase Client SDK");
  });
});

describe("getSetupProgress", () => {
  it("should return 0% when nothing is configured", () => {
    const flags = deriveReadinessFlags(null);
    const progress = getSetupProgress(flags);
    expect(progress).toBe(0);
  });

  it("should return 20% when only client config is done", () => {
    const flags = deriveReadinessFlags({
      clientConfig: {
        apiKey: "test",
        authDomain: "test.firebaseapp.com",
        projectId: "test",
        storageBucket: "test.appspot.com",
        messagingSenderId: "123",
        appId: "1:123:web:abc",
        lastValidatedAt: new Date().toISOString(),
      },
    });
    const progress = getSetupProgress(flags);
    expect(progress).toBe(20); // 1/5
  });

  it("should return 100% when all items are configured", () => {
    const flags = deriveReadinessFlags({
      clientConfig: {
        apiKey: "test",
        authDomain: "test.firebaseapp.com",
        projectId: "test",
        storageBucket: "test.appspot.com",
        messagingSenderId: "123",
        appId: "1:123:web:abc",
        lastValidatedAt: new Date().toISOString(),
      },
      secrets: {
        version: 1,
        dek_wrapped: "dek",
        items: {
          FIREBASE_SA_JSON: { ct: "e", iv: "i", tag: "t" },
          APIFY_API_KEY: { ct: "e", iv: "i", tag: "t" },
          GEMINI_API_KEY: { ct: "e", iv: "i", tag: "t" },
        },
      },
      modelPreference: {
        geminiDefaultModel: "gemini-1.5-flash",
        lastValidatedAt: new Date().toISOString(),
      },
    });
    const progress = getSetupProgress(flags);
    expect(progress).toBe(100); // 5/5
  });
});
