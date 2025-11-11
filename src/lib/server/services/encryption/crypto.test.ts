/** @jest-environment node */

import {
  generateDEK,
  wrapDEK,
  unwrapDEK,
  encryptSecret,
  decryptSecret,
  getLast4Chars,
  isValidEncryptedItem,
} from "./crypto";
import { EncryptionError } from "./types";

describe("encryption utilities", () => {
  const TEST_MASTER_KEY = Buffer.from(
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "hex"
  );

  describe("generateDEK", () => {
    it("generates a 32-byte DEK", () => {
      const dek = generateDEK();
      expect(dek).toBeInstanceOf(Buffer);
      expect(dek.length).toBe(32);
    });

    it("generates different DEKs each time", () => {
      const dek1 = generateDEK();
      const dek2 = generateDEK();
      expect(dek1.equals(dek2)).toBe(false);
    });
  });

  describe("wrapDEK and unwrapDEK", () => {
    it("wraps and unwraps a DEK correctly", () => {
      const originalDEK = generateDEK();
      const wrapped = wrapDEK(originalDEK, TEST_MASTER_KEY);

      expect(typeof wrapped).toBe("string");
      expect(wrapped.split(":").length).toBe(3); // iv:tag:ciphertext

      const unwrapped = unwrapDEK(wrapped, TEST_MASTER_KEY);
      expect(unwrapped.equals(originalDEK)).toBe(true);
    });

    it("produces different wrapped values with same DEK", () => {
      const dek = generateDEK();
      const wrapped1 = wrapDEK(dek, TEST_MASTER_KEY);
      const wrapped2 = wrapDEK(dek, TEST_MASTER_KEY);

      // Different IVs make different wrapped values
      expect(wrapped1).not.toBe(wrapped2);

      // But both unwrap to the same DEK
      const unwrapped1 = unwrapDEK(wrapped1, TEST_MASTER_KEY);
      const unwrapped2 = unwrapDEK(wrapped2, TEST_MASTER_KEY);
      expect(unwrapped1.equals(dek)).toBe(true);
      expect(unwrapped2.equals(dek)).toBe(true);
    });

    it("throws error when unwrapping with wrong master key", () => {
      const dek = generateDEK();
      const wrapped = wrapDEK(dek, TEST_MASTER_KEY);

      const wrongKey = Buffer.from(
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "hex"
      );

      expect(() => unwrapDEK(wrapped, wrongKey)).toThrow(EncryptionError);
      expect(() => unwrapDEK(wrapped, wrongKey)).toThrow(
        /Failed to unwrap DEK/
      );
    });

    it("throws error for invalid wrapped DEK format", () => {
      expect(() => unwrapDEK("invalid", TEST_MASTER_KEY)).toThrow(
        EncryptionError
      );
      expect(() => unwrapDEK("a:b", TEST_MASTER_KEY)).toThrow(EncryptionError);
    });

    it("throws error when master key is missing from env", () => {
      const originalKey = process.env.ENCRYPTION_MASTER_KEY;
      delete process.env.ENCRYPTION_MASTER_KEY;

      const dek = generateDEK();

      expect(() => wrapDEK(dek)).toThrow(EncryptionError);
      expect(() => wrapDEK(dek)).toThrow(/ENCRYPTION_MASTER_KEY/);

      process.env.ENCRYPTION_MASTER_KEY = originalKey;
    });

    it("throws error for invalid master key length", () => {
      const originalKey = process.env.ENCRYPTION_MASTER_KEY;
      process.env.ENCRYPTION_MASTER_KEY = "tooshort";

      const dek = generateDEK();

      expect(() => wrapDEK(dek)).toThrow(EncryptionError);
      expect(() => wrapDEK(dek)).toThrow(/must be 64 hex characters/);

      process.env.ENCRYPTION_MASTER_KEY = originalKey;
    });
  });

  describe("encryptSecret and decryptSecret", () => {
    it("encrypts and decrypts a plaintext secret", () => {
      const dek = generateDEK();
      const plaintext = "my-secret-api-key-12345";

      const encrypted = encryptSecret(plaintext, dek);

      expect(encrypted).toHaveProperty("ct");
      expect(encrypted).toHaveProperty("iv");
      expect(encrypted).toHaveProperty("tag");
      expect(typeof encrypted.ct).toBe("string");
      expect(typeof encrypted.iv).toBe("string");
      expect(typeof encrypted.tag).toBe("string");

      const decrypted = decryptSecret(encrypted, dek);
      expect(decrypted).toBe(plaintext);
    });

    it("encrypts JSON strings correctly", () => {
      const dek = generateDEK();
      const serviceAccount = JSON.stringify({
        type: "service_account",
        project_id: "test-project",
        private_key:
          "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n",
        client_email: "test@test.iam.gserviceaccount.com",
      });

      const encrypted = encryptSecret(serviceAccount, dek);
      const decrypted = decryptSecret(encrypted, dek);

      expect(decrypted).toBe(serviceAccount);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(serviceAccount));
    });

    it("produces different ciphertexts with same plaintext", () => {
      const dek = generateDEK();
      const plaintext = "same-secret";

      const encrypted1 = encryptSecret(plaintext, dek);
      const encrypted2 = encryptSecret(plaintext, dek);

      // Different IVs produce different ciphertexts
      expect(encrypted1.ct).not.toBe(encrypted2.ct);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      // But both decrypt to the same plaintext
      expect(decryptSecret(encrypted1, dek)).toBe(plaintext);
      expect(decryptSecret(encrypted2, dek)).toBe(plaintext);
    });

    it("throws error when decrypting with wrong DEK", () => {
      const correctDEK = generateDEK();
      const wrongDEK = generateDEK();
      const plaintext = "secret";

      const encrypted = encryptSecret(plaintext, correctDEK);

      expect(() => decryptSecret(encrypted, wrongDEK)).toThrow(EncryptionError);
      expect(() => decryptSecret(encrypted, wrongDEK)).toThrow(
        /Failed to decrypt/
      );
    });

    it("throws error for tampered ciphertext", () => {
      const dek = generateDEK();
      const plaintext = "secret";
      const encrypted = encryptSecret(plaintext, dek);

      // Tamper with ciphertext
      const tamperedCt = Buffer.from(encrypted.ct, "base64");
      tamperedCt[0] = tamperedCt[0]! ^ 0xff; // Flip bits
      const tampered = {
        ...encrypted,
        ct: tamperedCt.toString("base64"),
      };

      expect(() => decryptSecret(tampered, dek)).toThrow(EncryptionError);
    });

    it("handles empty strings", () => {
      const dek = generateDEK();
      const encrypted = encryptSecret("", dek);
      const decrypted = decryptSecret(encrypted, dek);
      expect(decrypted).toBe("");
    });

    it("handles unicode characters", () => {
      const dek = generateDEK();
      const plaintext = "🔐 Secret with émojis and spëcial çhars 日本語";
      const encrypted = encryptSecret(plaintext, dek);
      const decrypted = decryptSecret(encrypted, dek);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("getLast4Chars", () => {
    it("returns last 4 characters of a string", () => {
      expect(getLast4Chars("abcdefghijk")).toBe("hijk");
      expect(getLast4Chars("my-api-key-xyz123")).toBe("z123");
    });

    it("returns entire string if less than 4 characters", () => {
      expect(getLast4Chars("abc")).toBe("abc");
      expect(getLast4Chars("ab")).toBe("ab");
      expect(getLast4Chars("a")).toBe("a");
    });

    it("handles empty string", () => {
      expect(getLast4Chars("")).toBe("");
    });

    it("returns exactly 4 characters when string is exactly 4 chars", () => {
      expect(getLast4Chars("1234")).toBe("1234");
    });
  });

  describe("isValidEncryptedItem", () => {
    it("returns true for valid encrypted item", () => {
      const valid = {
        ct: "base64ciphertext",
        iv: "base64iv",
        tag: "base64tag",
      };
      expect(isValidEncryptedItem(valid)).toBe(true);
    });

    it("returns false for missing fields", () => {
      expect(isValidEncryptedItem({ ct: "x", iv: "y" })).toBe(false);
      expect(isValidEncryptedItem({ ct: "x", tag: "z" })).toBe(false);
      expect(isValidEncryptedItem({ iv: "y", tag: "z" })).toBe(false);
    });

    it("returns false for empty strings", () => {
      expect(isValidEncryptedItem({ ct: "", iv: "y", tag: "z" })).toBe(false);
      expect(isValidEncryptedItem({ ct: "x", iv: "", tag: "z" })).toBe(false);
      expect(isValidEncryptedItem({ ct: "x", iv: "y", tag: "" })).toBe(false);
    });

    it("returns false for non-string values", () => {
      expect(isValidEncryptedItem({ ct: 123, iv: "y", tag: "z" })).toBe(false);
      expect(isValidEncryptedItem({ ct: "x", iv: null, tag: "z" })).toBe(false);
      expect(isValidEncryptedItem({ ct: "x", iv: "y", tag: undefined })).toBe(
        false
      );
    });

    it("returns false for non-objects", () => {
      expect(isValidEncryptedItem(null)).toBe(false);
      expect(isValidEncryptedItem(undefined)).toBe(false);
      expect(isValidEncryptedItem("string")).toBe(false);
      expect(isValidEncryptedItem(123)).toBe(false);
      expect(isValidEncryptedItem([])).toBe(false);
    });
  });

  describe("end-to-end encryption workflow", () => {
    it("completes full encryption lifecycle", () => {
      // 1. Generate DEK
      const dek = generateDEK();

      // 2. Wrap DEK with master key
      const wrappedDEK = wrapDEK(dek, TEST_MASTER_KEY);

      // 3. Encrypt multiple secrets
      const apifyKey = "apify-api-key-xyz123";
      const geminiKey = "gemini-api-key-abc456";

      const encryptedApify = encryptSecret(apifyKey, dek);
      const encryptedGemini = encryptSecret(geminiKey, dek);

      // 4. Simulate storage and retrieval
      const storedData = {
        wrappedDEK,
        secrets: {
          apify: encryptedApify,
          gemini: encryptedGemini,
        },
      };

      // 5. Unwrap DEK
      const unwrappedDEK = unwrapDEK(storedData.wrappedDEK, TEST_MASTER_KEY);

      // 6. Decrypt secrets
      const decryptedApify = decryptSecret(
        storedData.secrets.apify,
        unwrappedDEK
      );
      const decryptedGemini = decryptSecret(
        storedData.secrets.gemini,
        unwrappedDEK
      );

      // 7. Verify
      expect(decryptedApify).toBe(apifyKey);
      expect(decryptedGemini).toBe(geminiKey);
      expect(getLast4Chars(decryptedApify)).toBe("z123");
      expect(getLast4Chars(decryptedGemini)).toBe("c456");
    });

    it("rotates DEK and re-encrypts secrets", () => {
      const oldDEK = generateDEK();
      const secret = "my-secret-key";

      // Encrypt with old DEK
      const encrypted = encryptSecret(secret, oldDEK);

      // Decrypt with old DEK
      const decrypted = decryptSecret(encrypted, oldDEK);

      // Generate new DEK
      const newDEK = generateDEK();

      // Re-encrypt with new DEK
      const reencrypted = encryptSecret(decrypted, newDEK);

      // Verify decryption with new DEK works
      const finalDecrypted = decryptSecret(reencrypted, newDEK);
      expect(finalDecrypted).toBe(secret);

      // Verify old DEK can't decrypt new ciphertext
      expect(() => decryptSecret(reencrypted, oldDEK)).toThrow();
    });
  });
});
