/**
 * Tester for OkxClient — OKX V5-signering, ordre-plassering, saldo, fills.
 *
 * Verifiserer OKX-spesifikke detaljer:
 *  - Signatur: base64(HMAC_SHA256(timestamp + method + path + body, secret))
 *  - Headere: OK-ACCESS-KEY/SIGN/TIMESTAMP/PASSPHRASE
 *  - brokerCode → tag-feltet (rebate-tagging)
 *  - 429 / 50111 → OkxLockoutError
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OkxClient, OkxLockoutError } from "../client";

const API = "https://eea.okx.com/api/v5";

function okResponse(data: unknown, code = "0") {
  return { ok: true, json: async () => ({ code, msg: "", data }) };
}

describe("OkxClient", () => {
  let client: OkxClient;

  beforeEach(() => {
    client = new OkxClient({
      apiKey: "test-key",
      apiSecret: "test-secret",
      passphrase: "test-passphrase",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("signering", () => {
    it("sender OK-ACCESS-KEY/TIMESTAMP/PASSPHRASE og SIGN-header", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse([{ ordId: "12345" }]));
      vi.stubGlobal("fetch", mockFetch);

      await client.placeOrder({
        instId: "BTC-USDT",
        side: "buy",
        ordType: "market",
        sz: "0.001",
      });

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${API}/trade/order`);
      expect(init.method).toBe("POST");
      expect(init.headers["OK-ACCESS-KEY"]).toBe("test-key");
      expect(init.headers["OK-ACCESS-PASSPHRASE"]).toBe("test-passphrase");
      expect(init.headers["OK-ACCESS-TIMESTAMP"]).toMatch(
        /^\d{4}-\d{2}-\d{2}T/,
      );
      // SIGN er base64 — ikke tom
      expect(init.headers["OK-ACCESS-SIGN"]).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it("signerer korrekt payload: timestamp+method+path+body med HMAC-SHA256", async () => {
      const mockFetch = vi.fn().mockResolvedValue(okResponse([]));
      vi.stubGlobal("fetch", mockFetch);

      await client.placeOrder({
        instId: "ETH-USDT",
        side: "sell",
        ordType: "limit",
        sz: "1.0",
        px: "3000.0",
      });

      const [, init] = mockFetch.mock.calls[0];
      const timestamp = init.headers["OK-ACCESS-TIMESTAMP"];
      const body = JSON.stringify({
        instId: "ETH-USDT",
        tdMode: "cash",
        side: "sell",
        ordType: "limit",
        sz: "1.0",
        px: "3000.0",
      });
      // Verify at sign = base64(HMAC_SHA256(ts + POST + path + body, secret))
      const { signHmacSha256Base64 } = await import("../client");
      const key = new TextEncoder().encode("test-secret");
      const data = new TextEncoder().encode(
        `${timestamp}POST/api/v5/trade/order${body}`,
      );
      const expected = await signHmacSha256Base64(key, data);
      expect(init.headers["OK-ACCESS-SIGN"]).toBe(expected);
    });

    it("legger brokerCode i tag-feltet (rebate-tagging)", async () => {
      const clientWithBroker = new OkxClient({
        apiKey: "k",
        apiSecret: "s",
        passphrase: "p",
        brokerCode: "KLARPAKKE123",
      });
      const mockFetch = vi.fn().mockResolvedValue(okResponse([]));
      vi.stubGlobal("fetch", mockFetch);

      await clientWithBroker.placeOrder({
        instId: "BTC-USDT",
        side: "buy",
        ordType: "market",
        sz: "0.001",
      });

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.tag).toBe("KLARPAKKE123");
    });

    it("setter x-simulated-trading ved simulate=true (OKX demo)", async () => {
      const demoClient = new OkxClient({
        apiKey: "k",
        apiSecret: "s",
        passphrase: "p",
        simulate: true,
      });
      const mockFetch = vi.fn().mockResolvedValue(okResponse([]));
      vi.stubGlobal("fetch", mockFetch);

      await demoClient.placeOrder({
        instId: "BTC-USDT",
        side: "buy",
        ordType: "market",
        sz: "0.001",
      });

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["x-simulated-trading"]).toBe("1");
    });
  });

  describe("feilhåndtering", () => {
    it("kaster OkxLockoutError ved HTTP 429", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 429 }),
      );

      const err = await client.getBalance().catch((e) => e);
      expect(err).toBeInstanceOf(OkxLockoutError);
    });

    it("kaster OkxLockoutError ved OKX-kode 50111 (rate limit)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(okResponse([], "50111")),
      );

      const err = await client.getBalance().catch((e) => e);
      expect(err).toBeInstanceOf(OkxLockoutError);
    });

    it("kaster vanlig Error ved andre OKX-feilkoder", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(okResponse([], "51000")),
      );

      const err = await client.getBalance().catch((e) => e);
      expect(err).not.toBeInstanceOf(OkxLockoutError);
      expect(err.message).toContain("51000");
    });
  });

  describe("getBalance", () => {
    it("returnerer saldo som ccy → eq-map", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          okResponse([
            {
              details: [
                { ccy: "USDT", eq: "153.68" },
                { ccy: "BTC", eq: "0.001" },
              ],
            },
          ]),
        ),
      );

      const balance = await client.getBalance();
      expect(balance).toEqual({ USDT: "153.68", BTC: "0.001" });
    });
  });

  describe("getFills", () => {
    it("henter fills med instId+ordId", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(
          okResponse([{ ordId: "x", fillPx: "64820.5", fillSz: "0.001" }]),
        );
      vi.stubGlobal("fetch", mockFetch);

      const fills = await client.getFills("BTC-USDT", "ord-1");

      expect(fills).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API}/trade/fills?instId=BTC-USDT&ordId=ord-1`,
        expect.anything(),
      );
    });
  });
});
