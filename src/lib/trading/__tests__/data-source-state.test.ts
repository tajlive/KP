import { describe, expect, it } from "vitest";
import {
  DATA_SOURCE_THRESHOLDS,
  getDiscoverStateReason,
  getTradingFeedState,
} from "@/lib/trading/data-source-state";

describe("getTradingFeedState", () => {
  it("returns error when fetch failed", () => {
    expect(
      getTradingFeedState({
        hasError: true,
        usesFallback: false,
        latestSignalAgeMinutes: 1,
      }),
    ).toBe("error");
  });

  it("returns demo when fallback data is used", () => {
    expect(
      getTradingFeedState({
        hasError: false,
        usesFallback: true,
        latestSignalAgeMinutes: null,
      }),
    ).toBe("demo");
  });

  it("returns empty when no data exists", () => {
    expect(
      getTradingFeedState({
        hasError: false,
        usesFallback: false,
        latestSignalAgeMinutes: null,
      }),
    ).toBe("empty");
  });

  it("returns stale when age is above threshold", () => {
    expect(
      getTradingFeedState({
        hasError: false,
        usesFallback: false,
        latestSignalAgeMinutes: DATA_SOURCE_THRESHOLDS.staleMinutes + 1,
      }),
    ).toBe("stale");
  });

  it("returns live when age is fresh", () => {
    expect(
      getTradingFeedState({
        hasError: false,
        usesFallback: false,
        latestSignalAgeMinutes: 2,
      }),
    ).toBe("live");
  });
});

describe("getDiscoverStateReason", () => {
  it("prioritizes auth_required", () => {
    expect(
      getDiscoverStateReason({
        hasError: false,
        unauthorized: true,
        leadersCount: 0,
      }),
    ).toBe("auth_required");
  });

  it("returns backend_error when request failed", () => {
    expect(
      getDiscoverStateReason({
        hasError: true,
        unauthorized: false,
        leadersCount: 0,
      }),
    ).toBe("backend_error");
  });

  it("returns no_public_traders when empty", () => {
    expect(
      getDiscoverStateReason({
        hasError: false,
        unauthorized: false,
        leadersCount: 0,
      }),
    ).toBe("no_public_traders");
  });

  it("returns ok for non-empty results", () => {
    expect(
      getDiscoverStateReason({
        hasError: false,
        unauthorized: false,
        leadersCount: 3,
      }),
    ).toBe("ok");
  });
});
