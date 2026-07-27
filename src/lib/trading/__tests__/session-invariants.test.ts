import { describe, it, expect } from "vitest";
import {
  detectNegativeCapital,
  detectExtremeGrowth,
  detectNegativePositions,
  checkAllInvariants,
  EXTREME_GROWTH_MULTIPLIER,
} from "../session-invariants";

describe("detectNegativeCapital", () => {
  it("flagger negativ current_capital_nok", () => {
    const v = detectNegativeCapital([
      { id: "s1", user_id: "u1", current_capital: 100, current_capital_nok: -50 },
    ]);
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe("negative_capital");
    expect(v[0].sessionId).toBe("s1");
    expect(v[0].value).toBe(-50);
  });

  it("flagger negativ current_capital selv om nok er positiv", () => {
    const v = detectNegativeCapital([
      { id: "s1", user_id: "u1", current_capital: -10, current_capital_nok: 500 },
    ]);
    expect(v).toHaveLength(1);
    expect(v[0].value).toBe(-10);
  });

  it("godtar null, positiv kapital og NULL-verdier", () => {
    const v = detectNegativeCapital([
      { id: "s1", user_id: "u1", current_capital: 0, current_capital_nok: 0 },
      { id: "s2", user_id: "u2", current_capital: 100, current_capital_nok: 1000 },
      { id: "s3", user_id: "u3", current_capital: null, current_capital_nok: null },
    ]);
    expect(v).toHaveLength(0);
  });

  it("tåler streng-tall fra databasen", () => {
    const v = detectNegativeCapital([
      { id: "s1", user_id: "u1", current_capital: "-5.5", current_capital_nok: "100" },
    ]);
    expect(v).toHaveLength(1);
    expect(v[0].value).toBe(-5.5);
  });
});

describe("detectExtremeGrowth", () => {
  it("flagger kapital over 10× startkapital", () => {
    const v = detectExtremeGrowth([
      {
        id: "s1",
        user_id: "u1",
        current_capital: 0,
        current_capital_nok: 150000,
        starting_capital_nok: 10000,
      },
    ]);
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe("extreme_growth");
    expect(v[0].value).toBe(15);
  });

  it("godtar ærlig vekst under terskelen", () => {
    const v = detectExtremeGrowth([
      {
        id: "s1",
        user_id: "u1",
        current_capital: 0,
        current_capital_nok: 25000,
        starting_capital_nok: 10000,
      },
    ]);
    expect(v).toHaveLength(0);
  });

  it("faller tilbake til initial_capital når starting_capital_nok mangler", () => {
    const v = detectExtremeGrowth([
      {
        id: "s1",
        user_id: "u1",
        current_capital: 200000,
        current_capital_nok: null,
        initial_capital: 10000,
      },
    ]);
    expect(v).toHaveLength(1);
    expect(v[0].value).toBe(20);
  });

  it("hopper over sesjoner uten positiv startkapital", () => {
    const v = detectExtremeGrowth([
      { id: "s1", user_id: "u1", current_capital: 999, current_capital_nok: 999, starting_capital_nok: 0 },
      { id: "s2", user_id: "u2", current_capital: 999, current_capital_nok: 999, starting_capital_nok: null, initial_capital: null },
    ]);
    expect(v).toHaveLength(0);
  });

  it("respekterer custom multiplier", () => {
    const v = detectExtremeGrowth(
      [
        {
          id: "s1",
          user_id: "u1",
          current_capital: 0,
          current_capital_nok: 30000,
          starting_capital_nok: 10000,
        },
      ],
      2
    );
    expect(v).toHaveLength(1);
  });

  it("fritar testbrukere fra vekst-alarm", () => {
    const sessions = [
      {
        id: "s1",
        user_id: "testtrader",
        current_capital: 0,
        current_capital_nok: 12431622,
        starting_capital_nok: 100000,
      },
      {
        id: "s2",
        user_id: "ekte-bruker",
        current_capital: 0,
        current_capital_nok: 500000,
        starting_capital_nok: 10000,
      },
    ];
    const v = detectExtremeGrowth(sessions, 10, new Set(["testtrader"]));
    expect(v).toHaveLength(1);
    expect(v[0].userId).toBe("ekte-bruker");
  });

  it("eksporterer standard-multiplier på 10", () => {
    expect(EXTREME_GROWTH_MULTIPLIER).toBe(10);
  });
});

describe("detectNegativePositions", () => {
  it("flagger negativ beholdning med symbol i detaljen", () => {
    const v = detectNegativePositions([
      { id: "p1", session_id: "s1", user_id: "u1", symbol: "BTCUSDT", quantity: -0.5 },
    ]);
    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe("negative_position");
    expect(v[0].detail).toContain("BTCUSDT");
    expect(v[0].value).toBe(-0.5);
  });

  it("godtar null og positive beholdninger", () => {
    const v = detectNegativePositions([
      { id: "p1", session_id: "s1", user_id: "u1", symbol: "BTCUSDT", quantity: 0 },
      { id: "p2", session_id: "s1", user_id: "u1", symbol: "ETHUSDT", quantity: 1.5 },
      { id: "p3", session_id: "s2", user_id: "u2", symbol: "SOLUSDT", quantity: null },
    ]);
    expect(v).toHaveLength(0);
  });
});

describe("checkAllInvariants", () => {
  it("samler alle brudd-typer", () => {
    const v = checkAllInvariants(
      [
        { id: "s1", user_id: "u1", current_capital: -1, current_capital_nok: -1 },
        {
          id: "s2",
          user_id: "u2",
          current_capital: 0,
          current_capital_nok: 200000,
          starting_capital_nok: 10000,
        },
      ],
      [{ id: "p1", session_id: "s1", user_id: "u1", symbol: "BTCUSDT", quantity: -1 }]
    );
    expect(v).toHaveLength(3);
    expect(v.map((x) => x.kind).sort()).toEqual([
      "extreme_growth",
      "negative_capital",
      "negative_position",
    ]);
  });

  it("returnerer tom liste når alt er rent", () => {
    const v = checkAllInvariants(
      [{ id: "s1", user_id: "u1", current_capital: 100, current_capital_nok: 1000, starting_capital_nok: 500 }],
      [{ id: "p1", session_id: "s1", user_id: "u1", symbol: "BTCUSDT", quantity: 0.1 }]
    );
    expect(v).toHaveLength(0);
  });
});
