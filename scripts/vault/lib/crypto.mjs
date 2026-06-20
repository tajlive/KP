#!/usr/bin/env node
/**
 * 🔐 Vault cryptography — AES-256-GCM
 *
 * Key format: 256-bit (32 bytes) encoded as a 64-character hex string.
 * Ciphertext format (JSON string):
 *   {
 *     "iv": "<16 bytes hex>",
 *     "authTag": "<16 bytes hex>",
 *     "encrypted": "<ciphertext hex>",
 *     "aad": "<associated data hex>",
 *     "version": 2
 *   }
 *
 * AAD binds the ciphertext to a subject (e.g. "secret:KEY_NAME") so a blob
 * cannot be swapped between secrets without breaking the auth tag.
 */

import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const CURRENT_VERSION = 2;

/**
 * Decode a 64-char hex key into a Buffer.
 * @param {string} keyHex
 * @returns {Buffer}
 */
export function decodeKey(keyHex) {
  if (typeof keyHex !== "string" || keyHex.length !== 64) {
    throw new Error("Vault key must be a 64-character hex string (256 bits).");
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error("Vault key decoded to an invalid length. Ensure it is 64 hex characters.");
  }
  return key;
}

/**
 * Generate a new 256-bit key as a 64-character hex string.
 * @returns {string}
 */
export function generateKey() {
  return randomBytes(KEY_LENGTH).toString("hex");
}

/**
 * Encrypt a plaintext value.
 * @param {string} value
 * @param {string} keyHex
 * @param {string} aadText associated data, e.g. "secret:KEY_NAME"
 * @returns {string} JSON ciphertext blob
 */
export function encrypt(value, keyHex, aadText) {
  const key = decodeKey(keyHex);
  const iv = randomBytes(IV_LENGTH);
  const aad = Buffer.from(String(aadText), "utf8");
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(aad);

  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    encrypted: encrypted.toString("hex"),
    aad: aad.toString("hex"),
    version: CURRENT_VERSION,
  });
}

/**
 * Decrypt a ciphertext blob. Throws if the auth tag does not verify.
 * @param {string} encryptedJson
 * @param {string} keyHex
 * @param {string} aadText associated data, e.g. "secret:KEY_NAME"
 * @returns {string}
 */
export function decrypt(encryptedJson, keyHex, aadText) {
  const key = decodeKey(keyHex);
  let blob;
  try {
    blob = JSON.parse(encryptedJson);
  } catch {
    throw new Error("Invalid encrypted JSON blob.");
  }

  if (blob.version !== CURRENT_VERSION) {
    // v1 did not use AAD; reject to force re-sync rather than silently weaken binding.
    throw new Error(`Unsupported ciphertext version: ${blob.version}. Re-sync from .env.local.`);
  }
  if (blob.iv == null || blob.authTag == null || blob.encrypted == null || blob.aad == null) {
    throw new Error("Ciphertext blob is missing required fields.");
  }

  const iv = Buffer.from(blob.iv, "hex");
  const authTag = Buffer.from(blob.authTag, "hex");
  const encrypted = Buffer.from(blob.encrypted, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length.");
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length.");
  }

  const expectedAad = Buffer.from(String(aadText), "utf8");
  const actualAad = Buffer.from(blob.aad, "hex");
  if (!actualAad.equals(expectedAad)) {
    throw new Error("Ciphertext AAD mismatch — possible secret swap attack.");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(expectedAad);

  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    throw new Error(`Decryption failed: ${err.message}`);
  }
}
