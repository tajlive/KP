import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { trackOnboardingStep } from "../onboarding-events";

describe("trackOnboardingStep", () => {
  const mockFetch = vi.fn().mockResolvedValue({ ok: true });

  beforeEach(() => {
    mockFetch.mockClear();
    vi.stubGlobal("fetch", mockFetch);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("poster event til /api/onboarding/events", () => {
    trackOnboardingStep("checklist_viewed");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/onboarding/events");
    expect(JSON.parse(opts.body as string)).toEqual({
      step: "checklist_viewed",
    });
  });

  it("deduper — samme step sendes kun én gang", () => {
    trackOnboardingStep("history_viewed");
    trackOnboardingStep("history_viewed");
    trackOnboardingStep("history_viewed");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("tracker ulike steps uavhengig", () => {
    trackOnboardingStep("checklist_viewed");
    trackOnboardingStep("first_trade_completed", { coin: "BTC", amount: 500 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const body = JSON.parse(mockFetch.mock.calls[1][1].body as string);
    expect(body.metadata).toEqual({ coin: "BTC", amount: 500 });
  });

  it("feiler stille ved nettverksfeil", () => {
    mockFetch.mockRejectedValueOnce(new Error("nettverk nede"));
    expect(() => trackOnboardingStep("checklist_viewed")).not.toThrow();
  });
});
