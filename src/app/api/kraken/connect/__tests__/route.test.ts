/**
 * POST /api/kraken/connect — tester
 *
 * Verifiserer:
 *  - Gyldige Kraken-nøkler → 200, nøklene lagres KRYPTERT (AES-256-GCM via ENCRYPTION_KEY fra .env.local)
 *  - Ugyldige Kraken-nøkler → 400 "Invalid API keys"
 *  - Upsert mot user_kraken_keys må ha onConflict: "user_id" (UNIQUE(user_id)) —
 *    ellers feiler ny tilkobling for samme bruker med duplicate-key-feil.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { config as loadEnv } from "dotenv";

// Last inn .env.local slik at ENCRYPTION_KEY (32-byte hex) er tilgjengelig for AES-GCM-kryptering.
loadEnv({ path: ".env.local" });
if (!process.env.ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY mangler i .env.local — trengs for krypteringstest");
}

const upsertMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({ upsert: upsertMock }),
  }),
}));

const getBalanceMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/exchanges/kraken/client", () => {
  class MockKrakenClient {
    getBalance = getBalanceMock;
  }
  return { KrakenClient: MockKrakenClient };
});

import { POST } from "../route";

function connectRequest(userId: string, apiKey: string, apiSecret: string) {
  return new NextRequest("http://localhost/api/kraken/connect", {
    method: "POST",
    body: JSON.stringify({ userId, apiKey, apiSecret }),
  });
}

describe("POST /api/kraken/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBalanceMock.mockResolvedValue({ USDT: "100.00" });
  });

  it("returnerer 200 og lagrer krypterte nøkler med onConflict:'user_id' for gyldige nøkler", async () => {
    upsertMock.mockResolvedValue({ error: null });
    getBalanceMock.mockResolvedValue({ USDT: "100.00" });

    const res = await POST(
      connectRequest("user-123", "api-key-123", "api-secret-456"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(getBalanceMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledTimes(1);

    // Upsert må peke på user_kraken_keys med onConflict på UNIQUE(user_id)
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-123", is_active: true }),
      expect.objectContaining({ onConflict: "user_id" }),
    );

    // Nøklene må ligge kryptert (aldri i klartekst)
    const row = upsertMock.mock.calls[0][0];
    expect(row.api_key_encrypted).toBeDefined();
    expect(row.api_secret_encrypted).toBeDefined();
    expect(row.api_key_encrypted).not.toBe("api-key-123");
    expect(row.api_secret_encrypted).not.toBe("api-secret-456");
    expect(row.api_key_encrypted).toMatch(/^[A-Za-z0-9+/]+={0,2}$/); // base64 (iv + ciphertext)
  });

  it("returnerer 400 med 'Invalid API keys' når Kraken avviser nøklene", async () => {
    getBalanceMock.mockRejectedValue(new Error("Kraken API error: EAPI:Invalid key"));

    const res = await POST(
      connectRequest("user-123", "bad-key", "bad-secret"),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid API keys");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returnerer 400 ved manglende felter", async () => {
    const res = await POST(connectRequest("", "", ""));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Missing required fields");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returnerer 500 og lagrer ikke når upsert feiler", async () => {
    upsertMock.mockResolvedValue({ error: new Error("duplicate key value violates unique constraint") });

    const res = await POST(
      connectRequest("user-123", "api-key-123", "api-secret-456"),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("duplicate key value");
  });
});
