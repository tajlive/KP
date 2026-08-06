# Edge-compatible request signing: Node crypto → Web Crypto

Applies to every exchange client in Klarpakke (`src/lib/exchanges/<exchange>/client.ts`).
Cloudflare Workers edge runtime: **no Node `crypto`/`Buffer`** — use `crypto.subtle`
(available in Workers, Node ≥19 global, and browsers). Same pattern for AES-GCM
encryption (`src/lib/crypto/encrypt-api-keys.ts`).

## Worked example — Kraken HMAC-SHA512 (done 2026-08-05)

Before (Node crypto):

```ts
import crypto from "crypto";

private signRequest(path: string, params: Record<string, string>): string {
  const nonce = this.getNonce();
  const postData = new URLSearchParams({ nonce, ...params }).toString();
  const hash = crypto.createHash("sha256").update(nonce + postData).digest();
  const hmac = crypto.createHmac("sha512", Buffer.from(this.apiSecret, "base64"))
    .update(path).update(hash).digest("base64");
  return hmac;
}
```

After (Web Crypto, edge-safe):

```ts
private async signRequest(path: string, params: Record<string, string>): Promise<string> {
  const nonce = this.getNonce();
  const postData = new URLSearchParams({ nonce, ...params }).toString();
  const encoder = new TextEncoder();

  // base64 secret → raw key bytes (atob returns latin1; charCodeAt is binary-safe)
  const keyData = Uint8Array.from(atob(this.apiSecret), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
  );

  const sha256Hash = await crypto.subtle.digest("SHA-256", encoder.encode(nonce + postData));
  const message = new Uint8Array([
    ...encoder.encode(path),
    ...new Uint8Array(sha256Hash),
  ]);

  const signature = await crypto.subtle.sign("HMAC", key, message);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
```

Call-site change (request() is already async — just add `await`):

```ts
const signature = await this.signRequest(path, params);
```

## Pitfalls

- **Async propagates**: making `signRequest` async breaks any sync call site at compile time
  (TS2322 `Promise<string>` not assignable). Fix by adding `await` — request() is already
  async, so it's a one-word change. Tests need no edits as long as they go through public
  async methods.
- **`atob` + `charCodeAt`** is the standard binary-safe base64→bytes trick (atob yields a
  latin1 string, byte-per-char). Do NOT use `TextEncoder` on the base64 string itself.
- **`String.fromCharCode(...bytes)` spread** is safe for HMAC-SHA512 (64-byte output) but
  blows the call stack for large buffers — chunk (e.g. 8K at a time) if a payload ever
  exceeds ~100KB.
- **Intermediate LSP diagnostics while patching**: converting in 2+ patches (import removal,
  method swap, `await` fix) shows a transient TS2322 between patches 2 and 3 — the third
  patch resolves it. Apply all patches in one batch and verify with a real `tsc --noEmit`
  run (unpiped — see pitfall in SKILL.md Verification section), not the interim LSP state.
- Signature is unchanged vs Node crypto — HMAC-SHA512 over `path + SHA256(nonce+postData)`
  with base64-decoded secret. A known-good Node `createHmac` result validates the Web Crypto
  output 1:1 (same bytes, same base64).
