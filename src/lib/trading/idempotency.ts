import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

export type IdempotencyState = "pending" | "completed" | "failed";

export type IdempotencyRecord =
  Database["public"]["Tables"]["idempotency_keys"]["Row"] & {
    state: IdempotencyState;
    response: unknown;
  };

const DEFAULT_TIMEOUT_MS = 30_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();

export async function withIdempotency<T>(
  db: SupabaseClient<Database>,
  key: string,
  scope: string,
  requestHash: string,
  operation: () => Promise<T>,
  options: { timeoutMs?: number } = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const expiresAt = new Date(Date.now() + ONE_DAY_MS).toISOString();

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: existing } = await db
      .from("idempotency_keys")
      .select("*")
      .eq("scope", scope)
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      if (existing.request_hash !== requestHash) {
        throw new Error(`Idempotency key collision: ${scope}/${key}`);
      }

      if (existing.state === "completed") {
        return existing.response as T;
      }

      if (existing.state === "pending") {
        const elapsed = Date.now() - new Date(existing.created_at).getTime();
        if (elapsed < timeoutMs) {
          throw new Error(`Idempotency key ${scope}/${key} is pending`);
        }
        // Pending but timed out → allow retry.
        await db.from("idempotency_keys").delete().eq("id", existing.id);
      }

      if (existing.state === "failed") {
        // Failed → allow retry by removing the previous failure record.
        await db.from("idempotency_keys").delete().eq("id", existing.id);
      }
    }

    const { error: insertError } = await db.from("idempotency_keys").insert({
      key,
      scope,
      request_hash: requestHash,
      state: "pending",
      expires_at: expiresAt,
    });

    if (!insertError) {
      try {
        const result = await operation();
        await db
          .from("idempotency_keys")
          .update({
            state: "completed",
            response: result as unknown as Json,
          })
          .eq("scope", scope)
          .eq("key", key);
        return result;
      } catch (err) {
        await db
          .from("idempotency_keys")
          .update({ state: "failed" })
          .eq("scope", scope)
          .eq("key", key);
        throw err;
      }
    }

    // Unique violation means another caller won the race; re-query on next loop.
    if (insertError.code !== "23505") {
      throw insertError;
    }
  }

  throw new Error(
    `Idempotency key ${scope}/${key} could not be acquired due to a race condition`
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function makeIdempotencyKey(
  parts: (string | number | null | undefined)[]
): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto API is required to create idempotency keys");
  }

  const digest = await subtle.digest(
    "SHA-256",
    encoder.encode(parts.map(String).join("|")),
  );
  return toHex(digest);
}
