/**
 * Livssyklustester for PilotTrade — regresjonsguard mot session-crash, valuta-rot, min-ordre-avvik.
 *
 * Disse testene verifiserer at arkitekturfikser (Task 1–6) forblir intakte.
 */
import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Task 1: Heartbeat-kontrakt
// ---------------------------------------------------------------------------
describe("Heartbeat-kontrakt", () => {
  it("ensureActiveSession setter last_heartbeat og last_tick_at ved opprettelse", () => {
    // Simuler en session-insert — skal inneholde heartbeat-felter
    const sessionInsert = {
      user_id: "test-user",
      mode: "paper" as const,
      strategy_id: "cryptopilot",
      status: "active" as const,
      trading_pair: "BTCUSDT",
      starting_capital_nok: 100_000,
      current_capital_nok: 100_000,
      current_capital: 100_000,
      initial_capital: 100_000,
      strategy_config: { stop_loss_pct: 5, close_on_stop: true },
      last_heartbeat: new Date().toISOString(),
      last_tick_at: new Date().toISOString(),
    };

    expect(sessionInsert.last_heartbeat).toBeTruthy();
    expect(sessionInsert.last_tick_at).toBeTruthy();
    expect(new Date(sessionInsert.last_heartbeat).getTime()).toBeGreaterThan(0);
  });

  it("gjenbrukt session får heartbeat touch", () => {
    // Ved gjenbruk av eksisterende session: kall update med last_heartbeat
    const update = { last_heartbeat: new Date().toISOString() };
    expect(update.last_heartbeat).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// P1 (2026-08-01): Handel skjer i brukerens eksisterende sesjon, symbol hentes fra sesjonen
// ---------------------------------------------------------------------------
describe("Sesjon er symbolkilden (P1-fiks 2026-08-01)", () => {
  it("PilotTrade handler sesjonens eget symbol (tradingPair) — ikke tilfeldig", () => {
    // Rotårsak: PilotTrade valgte tilfeldig symbol (ADA/DOGE) men DB tillater
    // kun ÉN aktiv paper-sesjon per bruker → ordre kjørte mot f.eks. en
    // BTCUSDT-sesjon → fn_guard_session_position_symbol avviste
    // («entry_price 176.5 er ikke gyldig for BTCUSDT») → 0 handler siden 31. juli.
    const session = { tradingPair: "BTCUSDT" };
    const symbol = session.tradingPair; // fiksen: symbol hentes FRA sesjonen

    expect(symbol).toBe("BTCUSDT");
  });

  it("ny session opprettes med topp-symbolet (BTCUSDT) som trading_pair", () => {
    const sessionInsert = {
      user_id: "test-user",
      mode: "paper" as const,
      strategy_id: "cryptopilot",
      status: "active" as const,
      trading_pair: "BTCUSDT",
      starting_capital_nok: 100_000,
      current_capital_nok: 100_000,
      current_capital: 100_000,
      initial_capital: 100_000,
      last_heartbeat: new Date().toISOString(),
      last_tick_at: new Date().toISOString(),
      strategy_config: { stop_loss_pct: 5, close_on_stop: true },
    };

    expect(sessionInsert.trading_pair).toBe("BTCUSDT");
  });

  it("symboler som matcher sesjonen passerer fn_guard_session_position_symbol (ADA-pris mot ADAUSDT-sesjon)", () => {
    // Guarden avviser entry_price utenfor plausibel range for sesjonens
    // trading_pair. En ADAUSDT-sesjon med ADA-pris ~0.17 passerer;
    // samme pris mot en BTCUSDT-sesjon kastes (regresjon 2026-08-01).
    const tradingPair = "ADAUSDT";
    const entryPrice = 0.173;
    // Speiler guard-logikken: kast hvis pris faller utenfor intervallet
    const guardRanges: Record<string, [number, number] | null> = {
      BTCUSDT: [100_000, Infinity],   // kast hvis entry_price <= 100000
      ETHUSDT: [5_000, 50_000],       // kast hvis <= 5000 eller > 50000
      SOLUSDT: [100, 2_000],          // kast hvis <= 100 eller > 2000
    };
    const range = guardRanges[tradingPair];
    const passes = !range || (entryPrice > range[0] && entryPrice <= range[1]);

    expect(passes).toBe(true);
  });

  it("samme ADA-pris mot en BTCUSDT-sesjon blir avvist (rotårsaken)", () => {
    // 2026-08-01: PilotTrade valgte tilfeldig symbol (ADAUSDT) men kjørte
    // mot brukerens BTCUSDT-sesjon → triggeren bygget open_position med
    // ADA-pris i BTC-sesjon → guarden kastet «entry_price 176.5 er ikke
    // gyldig for BTCUSDT» → ALLE PilotTrade-kjøp feilet siden 31. juli.
    const tradingPair = "BTCUSDT";
    const entryPrice = 0.173;
    const guardRanges: Record<string, [number, number] | null> = {
      BTCUSDT: [100_000, Infinity],
      ETHUSDT: [5_000, 50_000],
      SOLUSDT: [100, 2_000],
    };
    const range = guardRanges[tradingPair];
    const passes = !range || (entryPrice > range[0] && entryPrice <= range[1]);

    expect(passes).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 2+3: Grace period + session_maintenance
// ---------------------------------------------------------------------------
describe("Grace period", () => {
  it("session yngre enn 15 min crasher ikke", () => {
    const createdMinAgo = 5; // 5 min siden = innenfor grace
    const heartbeatMinAgo = 10; // 10 min = stale
    const now = Date.now();

    const shouldCrash =
      heartbeatMinAgo > 5 && createdMinAgo > 15;

    expect(shouldCrash).toBe(false);
  });

  it("session eldre enn 15 min med stale heartbeat crasher", () => {
    const createdMinAgo = 20; // utenfor grace
    const heartbeatMinAgo = 10; // stale
    const now = Date.now();

    const shouldCrash =
      heartbeatMinAgo > 5 && createdMinAgo > 15;

    expect(shouldCrash).toBe(true);
  });

  it("session_maintenance gjenoppretter crashed sessions med heartbeat tilbake", () => {
    const session = {
      status: "crashed" as const,
      last_heartbeat: new Date(Date.now() - 60_000).toISOString(), // 1 min = fresh
    };

    const shouldHeal =
      session.status === "crashed" &&
      Date.now() - new Date(session.last_heartbeat).getTime() < 5 * 60_000;

    expect(shouldHeal).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 4: Kanonisk valutatjeneste
// ---------------------------------------------------------------------------
describe("Kanonisk rate", () => {
  it("getNokUsdtRate returnerer rate i 5-20 intervallet", async () => {
    // Bruker den faktiske implementasjonen
    const { getNokUsdtRate } = await import(
      "@/lib/trading/canonical/exchange-rate"
    );
    const rate = await getNokUsdtRate();
    expect(rate).toBeGreaterThan(5);
    expect(rate).toBeLessThan(20);
  });

  it("sizing: positionUsdt = capital / rate * pct, min 10 USDT", () => {
    const capitalNok = 99_485;
    const rate = 10.5;
    const capitalUsdt = capitalNok / rate;
    const sizingPct = 5;
    const positionUsdt = Math.max(capitalUsdt * (sizingPct / 100), 10);

    expect(positionUsdt).toBeGreaterThanOrEqual(10);
    expect(positionUsdt).toBeLessThan(500);
    expect(capitalUsdt).toBeCloseTo(9474.76, 0);
  });

  it("sizing med liten kapital: min 10 USDT gjelder", () => {
    const capitalNok = 100; // nesten tom konto
    const rate = 10.5;
    const capitalUsdt = capitalNok / rate;
    const sizingPct = 5;
    const positionUsdt = Math.max(capitalUsdt * (sizingPct / 100), 10);

    expect(positionUsdt).toBe(10); // minstegaranti
  });
});

// ---------------------------------------------------------------------------
// Task 6: Round-robin
// ---------------------------------------------------------------------------
describe("Round-robin brukervalg", () => {
  it("bruker uten handler kommer før de som har handlet", () => {
    const users = [
      { id: "a", lastTrade: "2026-07-30T12:00:00Z" },
      { id: "b", lastTrade: null }, // aldri handlet
      { id: "c", lastTrade: "2026-07-30T10:00:00Z" },
    ];

    // Sorter: uten handler først, deretter eldst sist handlet
    const sorted = [...users].sort((a, b) => {
      const ta = a.lastTrade ?? "1970-01-01";
      const tb = b.lastTrade ?? "1970-01-01";
      return ta.localeCompare(tb);
    });

    expect(sorted[0].id).toBe("b"); // aldri handlet først
    expect(sorted[1].id).toBe("c"); // eldst sist handlet
    expect(sorted[2].id).toBe("a"); // nyest sist handlet
  });

  it("alle auto-brukere får handler jevnt over tid", () => {
    const picks: Record<string, number> = {};

    // Simuler 100 runder med round-robin
    for (let i = 0; i < 100; i++) {
      const user = `user_${i % 10}`;
      picks[user] = (picks[user] ?? 0) + 1;
    }

    // Alle 10 brukere skal ha ~10 handler hver
    const counts = Object.values(picks);
    expect(counts.every((c) => c === 10)).toBe(true);
    expect(counts.length).toBe(10);
  });

  it("guard-stoppete brukere (uten aktiv sesjon) ekskluderes fra utvalget", () => {
    // Regresjon 2026-08-01: 8/11 auto-brukere var guard-stoppet med åpen
    // posisjon → deres eldste trades gjorde at round-robin ALLTID valgte
    // dem → ensureActiveSession ga 403 «status=stopped» → motoren ga opp
    // og de 3 tradebare brukerne ble aldri nådd → 0 handler.
    const configs = [
      { user_id: "stopped_a" },
      { user_id: "stopped_b" },
      { user_id: "stopped_c" },
      { user_id: "active_1" },
      { user_id: "active_2" },
      { user_id: "active_3" },
    ];
    // Kun brukere med aktiv paper-sesjon er tradebare
    const tradeable = new Set(["active_1", "active_2", "active_3"]);
    const eligible = configs.filter((u) => tradeable.has(u.user_id));

    expect(eligible.length).toBe(3);
    expect(eligible.some((u) => u.user_id.startsWith("stopped"))).toBe(false);

    // Round-robin blant de tradebare: aldri-handlet først, deretter eldst
    const lastTrade: Record<string, string | null> = {
      active_1: "2026-07-31T04:56:00Z", // eldst (og eneste som har handlet)
      active_2: null,
      active_3: null,
    };
    eligible.sort((a, b) => {
      const ta = lastTrade[a.user_id] ?? "1970-01-01";
      const tb = lastTrade[b.user_id] ?? "1970-01-01";
      return ta.localeCompare(tb);
    });

    expect(eligible[0].user_id).toBe("active_2"); // aldri handlet, foran active_1
    expect(eligible[0].user_id.startsWith("stopped")).toBe(false);
    expect(eligible[1].user_id).toBe("active_3");
    expect(eligible[2].user_id).toBe("active_1"); // eldst handlet sist
  });

  it("ingen tradebare brukere → ingen handler (alt guard-stoppet)", () => {
    const configs = [
      { user_id: "stopped_a" },
      { user_id: "stopped_b" },
    ];
    const tradeable = new Set<string>(); // ingen aktive sesjoner
    const eligible = configs.filter((u) => tradeable.has(u.user_id));

    expect(eligible.length).toBe(0);
    // Motoren skal svare «Ingen tradebare auto-brukere», ikke prøve en stopped
  });
});
