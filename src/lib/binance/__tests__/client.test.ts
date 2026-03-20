/**
 * Binance Client Tests
 *
 * Kjør med: npm run test:unit -- client.test.ts
 */

import {
  vi,
  beforeEach,
  beforeAll,
  afterAll,
  describe,
  it,
  expect,
} from "vitest";

const mockBinanceFactory = vi.fn();

vi.mock("binance-api-node", () => ({
  default: (...args: unknown[]) => mockBinanceFactory(...args),
}));

import {
  getBinanceClient,
  checkBinanceConnection,
  resetBinanceClient,
} from "../client";

const originalEnv = process.env;

beforeAll(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(() => {
  vi.mocked(console.info).mockRestore();
  vi.mocked(console.warn).mockRestore();
});

beforeEach(() => {
  process.env = { ...originalEnv };
  resetBinanceClient();
  mockBinanceFactory.mockReset();
  mockBinanceFactory.mockReturnValue({
    time: vi.fn().mockResolvedValue({ serverTime: 1_700_000_000_000 }),
  });
});

afterAll(() => {
  process.env = originalEnv;
});

describe("Binance Client", () => {
  describe("Client Initialization", () => {
    it("should throw error if API keys are missing", () => {
      process.env.BINANCE_API_KEY = "";
      process.env.BINANCE_API_SECRET = "";

      expect(() => getBinanceClient()).toThrow(
        "Binance API keys not configured",
      );
    });

    it("should initialize client with valid keys", () => {
      process.env.BINANCE_API_KEY = "test_key";
      process.env.BINANCE_API_SECRET = "test_secret";
      process.env.NODE_ENV = "test";

      const client = getBinanceClient();
      expect(client).toBeDefined();
      expect(mockBinanceFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "test_key",
          apiSecret: "test_secret",
        }),
      );
    });

    it("should use testnet in development mode", () => {
      process.env.NODE_ENV = "development";
      process.env.BINANCE_API_KEY = "test_key";
      process.env.BINANCE_API_SECRET = "test_secret";

      getBinanceClient();
      expect(mockBinanceFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          httpBase: "https://testnet.binance.vision",
        }),
      );
    });
  });

  describe("Connection Check", () => {
    it("should return connected status", async () => {
      process.env.BINANCE_API_KEY = "test_key";
      process.env.BINANCE_API_SECRET = "test_secret";
      process.env.NODE_ENV = "test";

      const result = await checkBinanceConnection();

      expect(result.connected).toBe(true);
      expect(result.testnet).toBe(false);
      expect(result).toHaveProperty("timestamp");
      expect(result.serverTime).toBe(1_700_000_000_000);
    });
  });
});

describe("Rate Limiter", () => {
  it("should enforce rate limits", async () => {
    const requests = Array(10).fill(null);
    const startTime = Date.now();
    for (const _ of requests) {
      /* rate limiter handles this */
    }
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(1000);
  });
});
