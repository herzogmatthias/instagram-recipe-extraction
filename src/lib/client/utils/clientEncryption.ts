/**
 * Client-side encryption utilities
 * Uses Web Crypto API for AES-GCM encryption before sending to server
 *
 * This provides defense-in-depth:
 * - Secrets are encrypted in browser before transmission
 * - Uses a public transit key (exposed client + server side)
 * - Server decrypts with transit key, then re-encrypts with master key
 */

/**
 * Public transit encryption key (exposed to client and server)
 * This is NOT the master encryption key - it's only for transit security
 */
const TRANSIT_KEY_HEX =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert Uint8Array to base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Convert base64 to Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/**
 * Import the transit key for Web Crypto API
 */
async function getTransitKey(): Promise<CryptoKey> {
  const keyBytes = hexToBytes(TRANSIT_KEY_HEX);
  // Cast to BufferSource to satisfy Web Crypto TypeScript definitions
  const keyData: BufferSource = keyBytes as unknown as BufferSource;
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a secret on the client side before sending to server
 */
export async function encryptSecretClient(plaintext: string): Promise<{
  ct: string;
  iv: string;
  tag: string;
}> {
  const key = await getTransitKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits for GCM
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128, // 128-bit auth tag
    },
    key,
    data
  );

  // encrypted contains ciphertext + tag (last 16 bytes)
  const encryptedBytes = new Uint8Array(encrypted);
  const ciphertext = encryptedBytes.slice(0, -16);
  const tag = encryptedBytes.slice(-16);

  return {
    ct: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
    tag: bytesToBase64(tag),
  };
}

/**
 * Decrypt a secret on the client side (for verification purposes)
 */
export async function decryptSecretClient(encrypted: {
  ct: string;
  iv: string;
  tag: string;
}): Promise<string> {
  const key = await getTransitKey();
  const iv = base64ToBytes(encrypted.iv);
  const ciphertext = base64ToBytes(encrypted.ct);
  const tag = base64ToBytes(encrypted.tag);

  // Combine ciphertext and tag for Web Crypto API
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as unknown as BufferSource,
      tagLength: 128,
    },
    key,
    combined
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt multiple secrets
 */
export async function encryptSecretsClient(
  secrets: Record<string, string>
): Promise<
  Record<
    string,
    {
      ct: string;
      iv: string;
      tag: string;
    }
  >
> {
  const encrypted: Record<string, { ct: string; iv: string; tag: string }> = {};

  for (const [key, value] of Object.entries(secrets)) {
    if (value && value.trim().length > 0) {
      encrypted[key] = await encryptSecretClient(value);
    }
  }

  return encrypted;
}
