import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  type IdempotencyRecord,
  makeIdempotencyKey,
  withIdempotency,
} from "./idempotency";

function createMockClient(
  initial: IdempotencyRecord[] = [],
  options?: { raceCondition?: IdempotencyRecord }
): SupabaseClient<Database> {
  const rows = new Map<string, IdempotencyRecord>(
    initial.map((r) => [`${r.scope}:${r.key}`, { ...r }])
  );

  const raceKey = options?.raceCondition
    ? `${options.raceCondition.scope}:${options.raceCondition.key}`
    : undefined;
  let firstSelectDone = false;
  let firstInsertDone = false;

  type Chain = { method: string; args: unknown[] }[];

  const execute = (chain: Chain) => {
    const fromCall = chain[0];
    if (!fromCall || fromCall.method !== "from") {
      throw new Error("Expected query to start with from()");
    }
    const table = fromCall.args[0] as string;
    if (table !== "idempotency_keys") {
      throw new Error(`Unexpected table: ${table}`);
    }

    const op = chain[1]?.method;

    const extractFilters = (startIndex: number) => {
      const filters: Record<string, unknown> = {};
      for (let i = startIndex; i < chain.length; i++) {
        const call = chain[i];
        if (call.method === "eq") {
          const [column, value] = call.args as [string, unknown];
          filters[column] = value;
        }
      }
      return filters;
    };

    if (op === "select") {
      const filters = extractFilters(2);
      const rowKey =
        filters.scope && filters.key
          ? `${filters.scope}:${filters.key}`
          : undefined;
      let record = null;
      if (rowKey) {
        if (rowKey === raceKey && !firstSelectDone) {
          firstSelectDone = true;
        } else {
          record = rows.get(rowKey) ?? null;
        }
      }
      const terminal = chain[chain.length - 1].method;
      if (terminal === "maybeSingle") {
        return { data: record ? { ...record } : null, error: null };
      }
      if (terminal === "single") {
        return record
          ? { data: { ...record }, error: null }
          : { data: null, error: { code: "PGRST116", message: "No rows" } };
      }
      throw new Error(`Unexpected select terminal: ${terminal}`);
    }

    if (op === "insert") {
      const values = chain[1].args[0] as Partial<IdempotencyRecord>;
      const rowKey = `${values.scope}:${values.key}`;
      if (rowKey === raceKey && !firstInsertDone) {
        firstInsertDone = true;
        rows.set(rowKey, { ...options.raceCondition! });
        return { error: { code: "23505", message: "unique violation" } };
      }
      if (rows.has(rowKey)) {
        return { error: { code: "23505", message: "unique violation" } };
      }
      rows.set(rowKey, {
        id: values.id ?? "row-id",
        key: values.key as string,
        scope: values.scope as string,
        request_hash: values.request_hash as string,
        state: values.state as IdempotencyRecord["state"],
        response: values.response ?? null,
        created_at: values.created_at ?? new Date().toISOString(),
        expires_at: values.expires_at as string,
      });
      return { error: null };
    }

    if (op === "update") {
      const values = chain[1].args[0] as Partial<IdempotencyRecord>;
      const filters = extractFilters(2);
      const rowKey = filters.scope && filters.key ? `${filters.scope}:${filters.key}` : undefined;
      if (rowKey && rows.has(rowKey)) {
        Object.assign(rows.get(rowKey)!, values);
      }
      return { error: null };
    }

    if (op === "delete") {
      const filters = extractFilters(2);
      if (filters.id) {
        for (const [rowKey, record] of rows) {
          if (record.id === filters.id) {
            rows.delete(rowKey);
            break;
          }
        }
      } else if (filters.scope && filters.key) {
        rows.delete(`${filters.scope}:${filters.key}`);
      }
      return { error: null };
    }

    throw new Error(`Unexpected operation: ${op}`);
  };

  const createProxy = (chain: Chain): unknown => {
    return new Proxy(() => undefined, {
      get: (_target, prop) => {
        if (prop === "then") {
          return (onFulfilled: (value: unknown) => unknown) => {
            return Promise.resolve(onFulfilled(execute(chain)));
          };
        }
        return (...args: unknown[]) =>
          createProxy([...chain, { method: prop as string, args }]);
      },
    });
  };

  return {
    from: (table: string) => createProxy([{ method: "from", args: [table] }]),
  } as unknown as SupabaseClient<Database>;
}

describe("makeIdempotencyKey", () => {
  it("is deterministic for the same inputs", () => {
    const a = makeIdempotencyKey(["scope", "id", 42]);
    const b = makeIdempotencyKey(["scope", "id", 42]);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("changes when input order changes", () => {
    const a = makeIdempotencyKey(["a", "b"]);
    const b = makeIdempotencyKey(["b", "a"]);
    expect(a).not.toBe(b);
  });
});

describe("withIdempotency", () => {
  it("returns the stored response on duplicate calls without re-running the operation", async () => {
    const db = createMockClient();
    const operation = vi.fn(async () => ({ value: 123 }));

    const first = await withIdempotency(
      db,
      "key-1",
      "scope-a",
      "hash-1",
      operation
    );
    const second = await withIdempotency(
      db,
      "key-1",
      "scope-a",
      "hash-1",
      operation
    );

    expect(operation).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ value: 123 });
    expect(second).toEqual({ value: 123 });
  });

  it("throws when the same key is reused with a different request hash", async () => {
    const db = createMockClient();
    const operation = vi.fn(async () => ({ value: 1 }));

    await withIdempotency(db, "key-2", "scope-a", "hash-a", operation);

    await expect(
      withIdempotency(db, "key-2", "scope-a", "hash-b", operation)
    ).rejects.toThrow("Idempotency key collision: scope-a/key-2");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries after a pending record has timed out", async () => {
    const db = createMockClient([
      {
        id: "pending-id",
        scope: "scope-a",
        key: "key-3",
        request_hash: "hash-3",
        state: "pending",
        response: null,
        created_at: new Date(Date.now() - 60_000).toISOString(),
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
    ]);
    const operation = vi.fn(async () => ({ value: 42 }));

    const result = await withIdempotency(
      db,
      "key-3",
      "scope-a",
      "hash-3",
      operation,
      { timeoutMs: 30_000 }
    );

    expect(result).toEqual({ value: 42 });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("throws when a pending record has not timed out", async () => {
    const db = createMockClient([
      {
        id: "pending-id",
        scope: "scope-a",
        key: "key-4",
        request_hash: "hash-4",
        state: "pending",
        response: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
    ]);
    const operation = vi.fn(async () => ({ value: 99 }));

    await expect(
      withIdempotency(db, "key-4", "scope-a", "hash-4", operation, {
        timeoutMs: 30_000,
      })
    ).rejects.toThrow("Idempotency key scope-a/key-4 is pending");
    expect(operation).not.toHaveBeenCalled();
  });

  it("retries after a failed record", async () => {
    const db = createMockClient([
      {
        id: "failed-id",
        scope: "scope-a",
        key: "key-5",
        request_hash: "hash-5",
        state: "failed",
        response: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
    ]);
    const operation = vi.fn(async () => ({ value: "fresh" }));

    const result = await withIdempotency(
      db,
      "key-5",
      "scope-a",
      "hash-5",
      operation
    );

    expect(result).toEqual({ value: "fresh" });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("marks the record as failed when the operation throws", async () => {
    const db = createMockClient();
    const operation = vi.fn(async () => {
      throw new Error("boom");
    });

    await expect(
      withIdempotency(db, "key-fail", "scope-a", "hash-fail", operation)
    ).rejects.toThrow("boom");

    const { data: record } = await db
      .from("idempotency_keys")
      .select("*")
      .eq("scope", "scope-a")
      .eq("key", "key-fail")
      .single();

    expect(record?.state).toBe("failed");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("returns the stored response after a 23505 race condition", async () => {
    const db = createMockClient([], {
      raceCondition: {
        id: "race-id",
        scope: "scope-a",
        key: "key-race",
        request_hash: "hash-race",
        state: "completed",
        response: { value: "stored" },
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
    });
    const operation = vi.fn(async () => ({ value: "new" }));

    const result = await withIdempotency(
      db,
      "key-race",
      "scope-a",
      "hash-race",
      operation
    );

    expect(result).toEqual({ value: "stored" });
    expect(operation).not.toHaveBeenCalled();
  });
});
