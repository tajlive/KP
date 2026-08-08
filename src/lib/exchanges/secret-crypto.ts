import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function getExchangeKey(): Buffer {
  const secret =
    process.env.EXCHANGE_ENCRYPTION_SECRET ??
    process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("Missing EXCHANGE_ENCRYPTION_SECRET");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptExchangeSecret(plainText: string): {
  ciphertext: string;
  nonce: string;
} {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, getExchangeKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Store auth tag as prefix to ciphertext.
  const combined = Buffer.concat([authTag, encrypted]);
  return {
    ciphertext: combined.toString("base64"),
    nonce: iv.toString("base64"),
  };
}

export function decryptExchangeSecret(
  ciphertextB64: string,
  nonceB64: string,
): string {
  const iv = Buffer.from(nonceB64, "base64");
  const combined = Buffer.from(ciphertextB64, "base64");
  const authTag = combined.subarray(0, 16);
  const encrypted = combined.subarray(16);
  const decipher = crypto.createDecipheriv(ALGO, getExchangeKey(), iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString("utf8");
}
