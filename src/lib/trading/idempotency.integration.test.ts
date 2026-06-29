import { describe, it, expect, beforeEach, vi } from "vitest";
import { withIdempotency } from "./idempotency";
import { createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeif = URL && KEY ? describe : describe.skip;

vi.mock("@/lib/supabase/server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/server")>(
    "@/lib/supabase/server"
  );
  return {
    ...actual,
    createServerClient: vi.fn(async () =>
      createSupabaseClient<Database>(
        URL!,
        KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
    ),
  };
});

describeif("withIdempotency", () => {
  beforeEach(async () => {
    const db = await createServerClient();
    await db.from("idempotency_keys").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  });

  it("returns the same result on duplicate calls", async () => {
    const db = await createServerClient();
    const op = async () => ({ status: "ok", value: Math.random() });

    const first = await withIdempotency(db, "key-1", "scope-a", "hash-1", op);
    const second = await withIdempotency(db, "key-1", "scope-a", "hash-1", op);

    expect(first.value).toBe(second.value);
  });

  it("throws if the same key is reused with a different request hash", async () => {
    const db = await createServerClient();
    const op = async () => ({ status: "ok" });

    await withIdempotency(db, "key-2", "scope-a", "hash-a", op);
    await expect(withIdempotency(db, "key-2", "scope-a", "hash-b", op)).rejects.toThrow();
  });
});
