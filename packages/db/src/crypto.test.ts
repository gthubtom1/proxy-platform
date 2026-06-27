import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { encryptSecret, decryptSecret } from "./index.js";

// encryptSecret/decryptSecret take the already-derived 32-byte key buffer
// (production derives it from ENCRYPTION_KEY via sha256). Build the same way.
const key = createHash("sha256").update("unit-test-encryption-key").digest();
const otherKey = createHash("sha256").update("a-different-key").digest();

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret back to the original plaintext", () => {
    const secret = "upstream-password-!@#$%^&*()_+中文";
    const encrypted = encryptSecret(secret, key);
    expect(decryptSecret(encrypted, key)).toBe(secret);
  });

  it("produces the v1 token format and never leaks the plaintext", () => {
    const secret = "topsecret";
    const encrypted = encryptSecret(secret, key);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(encrypted.split(":")).toHaveLength(4);
    expect(encrypted).not.toContain(secret);
  });

  it("uses a random IV so the same secret encrypts differently each time", () => {
    const a = encryptSecret("same", key);
    const b = encryptSecret("same", key);
    expect(a).not.toBe(b);
    // ...but both still decrypt to the same plaintext
    expect(decryptSecret(a, key)).toBe("same");
    expect(decryptSecret(b, key)).toBe("same");
  });

  it("fails to decrypt with the wrong key (GCM auth tag rejects it)", () => {
    const encrypted = encryptSecret("secret", key);
    expect(() => decryptSecret(encrypted, otherKey)).toThrow();
  });

  it("rejects a tampered ciphertext", () => {
    const encrypted = encryptSecret("secret", key);
    const parts = encrypted.split(":");
    // flip the last char of the ciphertext segment
    const ct = parts[3];
    parts[3] = ct.slice(0, -1) + (ct.endsWith("A") ? "B" : "A");
    expect(() => decryptSecret(parts.join(":"), key)).toThrow();
  });

  it("rejects an unsupported/garbage token format", () => {
    expect(() => decryptSecret("not-a-valid-token", key)).toThrow("Unsupported encrypted secret format");
    expect(() => decryptSecret("v2:a:b:c", key)).toThrow("Unsupported encrypted secret format");
  });
});
