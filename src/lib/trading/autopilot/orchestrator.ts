/**
 * Autopilot Orchestrator (Task C1, autopilot-plan 2026-08-06).
 *
 * Per-bruker pipeline som binder scanner + allokering + grid + reinvestering:
 *
 *   1. Hent + dekrypter Kraken-nøkler fra user_kraken_keys (AES-256-GCM)
 *   2. Opprett KrakenClient
 *   3. scanPortfolio(client, aktivePar) → Portfolio (equity, freeUsdc, posisjoner)
 *   4. allocateCapital(equity) → allokering per par
 *   5. Per par: grid-tick via runGridTick (fill → trailing-salg, salg-fill →
 *      re-kjøp + gevinst); første kjøring → legg kjøpsnivåer under nåpris
 *   6. evaluateProgressiveDrawdown(equity, initialEquity) → kill/reduced/normal
 *   7. computeReinvest(realisert gevinst) → 80 % > 10 USDC → ny idle-kapital
 *   8. UPSERT autopilot_state (service-role)
 *
 * KRITISKE REGLER (fra kveldens lærdom):
 * - XXBT/XETH asset-mapping: scanneren leser bal[cfg.asset] — orkestratoren
 *   sender PAIR_CFG-parene (XBTUSDC/ETHUSDC/…), aldri rå asset-navn.
 * - Kill-switch per bruker: drawdown_kill=true stopper ALL trading for DEN
 *   brukeren. Isolasjon er strukturell — hver bruker har egne Kraken-nøkler
 *   (egen konto), så kansellering av «alle åpne ordrer» berører kun brukeren.
 * - Progressiv drawdown: 7 % → halverte nivåer (mult 0.5), 15 % → full kill.
 * - Reinvestering: 80 % av gevinst > 10 USDC → ny idle-kapital for grid-nivåer.
 * - Grid-konfigurasjon: PAIR_CFG (kraken-grid-config.mjs) er SSoT for
 *   dec/ordremin/spacing.
 * - Grid-state SSoT: autopilot_state.grid_levels (JSONB) — hver kjøring
 *   leser → opererer → skriver tilbake. Ingen lokal state-fil.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { decryptApiKey } from "@/lib/crypto/encrypt-api-keys";
import { KrakenClient } from "@/lib/exchanges/kraken/client";
import {
  PAIR_CFG,
  ACTIVE_PAIRS,
  MIN_LEVEL_USDC,
  MAX_OPEN_ORDERS,
  IDLE_THRESHOLD,
} from "../kraken-grid-config.mjs";
import { runGridTick, type PersistedGridOrder } from "../kraken-grid";
import { computeDynamicSpacing } from "../dynamic-spacing";
import {
  shouldFallbackToDCA,
  pickDcaPair,
  computeDcaOrder,
} from "../strategy-fallback";
import { scanPortfolio, type Portfolio } from "./scanner";
import { allocateCapital, type Allocation } from "./allocator";
import {
  evaluateProgressiveDrawdown,
  shouldActivateFivePair,
  type ProgressiveDrawdownResult,
} from "../kraken-kill-switch";
import { computeReinvest } from "../kraken-reinvest";

/** PAIR_CFG er JS (.mjs) med infererte literale nøkler — indekser via Record. */
const PAIR_CFG_LOOKUP = PAIR_CFG as unknown as Record<
  string,
  | {
      dec: number;
      ordremin: number;
      spacing: number;
      active: boolean;
      asset: string;
    }
  | undefined
>;

/** Par som aktiveres ved equity ≥ 250 USDC (Task 6 — shouldActivateFivePair). */
const FIVE_PAIR_CANDIDATES = ["ADAUSDC", "DOTUSDC"];

/** Antall kjøpsnivåer ved første kjøring per par. */
const DEFAULT_INITIAL_LEVELS_PER_PAIR = 5;

// ==================== DB-grensesnitt (mockbart) ====================

export interface KrakenKeysRow {
  api_key_encrypted: string;
  api_secret_encrypted: string;
  is_active: boolean;
}

export interface AutopilotStateRow {
  user_id: string;
  activated: boolean;
  current_equity_usdc: number;
  drawdown_kill: boolean;
  five_pair_activated: boolean;
  grid_levels: Record<string, PersistedGridOrder[]>;
  initial_equity_usdc: number;
  realized_profit_usdc: number;
  total_fills: number;
  last_fill_at: string | null;
  last_run: string | null;
  updated_at: string;
  created_at: string;
}

export interface AutopilotStatePatch {
  activated: boolean;
  current_equity_usdc: number;
  drawdown_kill: boolean;
  five_pair_activated: boolean;
  grid_levels: Record<string, PersistedGridOrder[]>;
  initial_equity_usdc: number;
  realized_profit_usdc: number;
  total_fills?: number;
  last_fill_at?: string | null;
  last_run: string;
}

/**
 * Minimalt DB-grensesnitt orkestratoren trenger. Tester mocker dette direkte;
 * produksjon bruker createAutopilotDb() med service-role-klienten.
 */
export interface AutopilotDb {
  fetchKrakenKeys(userId: string): Promise<KrakenKeysRow | null>;
  fetchAutopilotState(userId: string): Promise<AutopilotStateRow | null>;
  saveAutopilotState(userId: string, patch: AutopilotStatePatch): Promise<void>;
}

/** Supabase-klient-typen adapteren aksepterer (kun `from`-kjeden). */
export type SupabaseLike = Pick<SupabaseClient<Database>, "from">;

/**
 * Adapter fra en ekte Supabase-klient til AutopilotDb.
 * Bruk service-role-klienten (RLS-bypass) — autopilot_state eies av systemet.
 */
export function createAutopilotDb(supabase: SupabaseLike): AutopilotDb {
  return {
    async fetchKrakenKeys(userId) {
      const { data, error } = await supabase
        .from("user_kraken_keys")
        .select("api_key_encrypted, api_secret_encrypted, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as KrakenKeysRow | null;
    },

    async fetchAutopilotState(userId) {
      const { data, error } = await supabase
        .from("autopilot_state")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        grid_levels: (data.grid_levels ?? {}) as unknown as Record<
          string,
          PersistedGridOrder[]
        >,
      } as AutopilotStateRow;
    },

    async saveAutopilotState(userId, patch) {
      // grid_levels er Record<> i domenet, Json i DB-schemaet — cast kun feltet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: any = {
        user_id: userId,
        ...patch,
        grid_levels: patch.grid_levels as unknown as Json,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("autopilot_state")
        .upsert(row, { onConflict: "user_id" });
      if (error) throw error;
    },
  };
}

/**
 * Produksjons-wiring: service-role-klient fra @/lib/supabase/server
 * (dynamisk import — modulen krever Next.js-kontekst; aldri kalt i tester).
 */
export async function createAutopilotDbFromEnv(): Promise<AutopilotDb> {
  const { createClient } = await import("@/lib/supabase/server");
  return createAutopilotDb(createClient());
}

// ==================== Opsjoner og resultat ====================

export interface OrchestratorOptions {
  /** USDC-ledig som utløser nytt idle-nivå (default: IDLE_THRESHOLD = 25) */
  idleThresholdUsdc?: number;
  /** Minste nivåstørrelse i USDC (default: MIN_LEVEL_USDC = 8) */
  minLevelUsdc?: number;
  /** Maks åpne ordrer før nye nivåer stoppes (default: MAX_OPEN_ORDERS = 20) */
  maxOpenOrders?: number;
  /** Antall kjøpsnivåer ved første kjøring per par (default: 5) */
  initialLevelsPerPair?: number;
}

export interface AutopilotSuccess {
  ok: true;
  userId: string;
  /** Første kjøring for brukeren (ingen autopilot_state-rad) */
  firstRun: boolean;
  portfolio: Portfolio;
  allocation: Allocation[];
  drawdown: ProgressiveDrawdownResult;
  /** Kill utløst DENNE kjøringen (equity falt over terskelen nå) */
  killTriggered: boolean;
  /** drawdown_kill aktiv (fra før eller utløst nå) */
  killed: boolean;
  cancelledOrders: number;
  /** Antall fills detektert på tvers av par */
  fills: number;
  /** Realisert gevinst denne kjøringen (etter fee) */
  realizedProfitUsdc: number;
  /** Reinvestert beløp (80 % av gevinst > 10 USDC) → ny idle-kapital */
  reinvestedUsdc: number;
  idleLevelsPlaced: number;
  newOrdersPlaced: number;
  dcaAmount?: number;
  fivePairActivated: boolean;
}

export interface AutopilotFailure {
  ok: false;
  userId: string;
  error: string;
}

export type AutopilotRunResult = AutopilotSuccess | AutopilotFailure;

// ==================== Rene hjelpere (TDD-testet via orkestratoren) ====================

export interface InitialLevel {
  price: number;
  volume: string;
  levelUsdc: number;
}

/**
 * Bygger kjøpsnivåer for første kjøring: `levels` nivåer under nåpris med
 * PAIR_CFG.spacing, pris rundet til cfg.dec, volum fra levelUsdc.
 * - Nivåer med volum < ordremin × 1.1 droppes (Kraken minste-ordre-guard).
 * - levelSizeMultiplier (progressiv drawdown) halverer nivåene ved 7–15 %.
 * - Antall nivåer kappes så totalen ikke overstiger capitalUsdc.
 */
export function buildInitialBuyLevels(opts: {
  pair: string;
  currentPrice: number;
  capitalUsdc: number;
  levels: number;
  minLevelUsdc: number;
  levelSizeMultiplier: number;
  spacing?: number;
}): InitialLevel[] {
  const {
    pair,
    currentPrice,
    capitalUsdc,
    levels,
    minLevelUsdc,
    levelSizeMultiplier,
  } = opts;
  const cfg = PAIR_CFG_LOOKUP[pair];
  if (!cfg || currentPrice <= 0 || capitalUsdc <= 0 || levels <= 0) return [];

  const spacing = opts.spacing ?? cfg.spacing;
  const dec = cfg.dec;
  const capitalPerLevel = capitalUsdc / levels;
  const levelUsdc =
    Math.max(minLevelUsdc, capitalPerLevel) * levelSizeMultiplier;
  // Kapp antall nivåer hvis kapitalen ikke dekker alle (aldri over-alloker)
  const count = Math.min(
    levels,
    Math.max(
      1,
      Math.floor(capitalUsdc / Math.max(minLevelUsdc, capitalPerLevel)),
    ),
  );

  const out: InitialLevel[] = [];
  for (let i = 1; i <= count; i++) {
    const price = +(currentPrice * (1 - spacing * i)).toFixed(dec);
    const volume = (levelUsdc / price).toFixed(8).replace(/\.?0+$/, "");
    if (parseFloat(volume) < cfg.ordremin * 1.1) continue;
    out.push({ price, volume, levelUsdc });
  }
  return out;
}

/**
 * Velger par for nytt idle-nivå: par med MINST gap mellom nåpris og laveste
 * åpne kjøpsnivå (samme regel som scripts/kraken-grid-manager.mjs — nivået
 * som er nærmest å bli truffet forlenges nedover). Uten åpne kjøp brukes
 * nåpris som laveste (gap 0 → nytt nivå like under markedet).
 */
export function pickIdlePair(
  pairs: string[],
  gridLevels: Record<string, PersistedGridOrder[]>,
  prices: Record<string, number>,
): { pair: string; lowest: number } | null {
  let best: { pair: string; lowest: number; gap: number } | null = null;

  for (const pair of pairs) {
    const priceNow = prices[pair];
    if (!priceNow || priceNow <= 0) continue;
    if (!PAIR_CFG_LOOKUP[pair]) continue;

    const buys = (gridLevels[pair] ?? []).filter(
      (o) => o.side === "buy" && o.status === "open",
    );
    const lowest = buys.length
      ? Math.min(...buys.map((o) => o.price))
      : priceNow;
    const gap = (priceNow - lowest) / priceNow;
    if (!best || gap < best.gap) best = { pair, lowest, gap };
  }

  return best ? { pair: best.pair, lowest: best.lowest } : null;
}

// ==================== Hovedpipeline ====================

/** Par orkestratoren kan operere på: active i PAIR_CFG + 5-par-kandidater når aktivert. */
function eligiblePairs(fivePairActive: boolean): string[] {
  const pairs = ACTIVE_PAIRS();
  if (fivePairActive) {
    for (const p of FIVE_PAIR_CANDIDATES) {
      if (PAIR_CFG_LOOKUP[p] && !pairs.includes(p)) pairs.push(p);
    }
  }
  return pairs;
}

/**
 * Kjører hele autopilot-pipelinen for ÉN bruker.
 *
 * Kill-rekkefølge (sikkerhet FØR ordreplassering): drawdown evalueres rett
 * etter scanning — en bruker i kill legger ALDRI nye ordrer denne kjøringen,
 * og eksisterende åpne ordrer kanselleres én gang ved utløsning.
 */
export async function processAutopilotUser(
  db: AutopilotDb,
  userId: string,
  opts: OrchestratorOptions = {},
): Promise<AutopilotRunResult> {
  const idleThresholdUsdc = opts.idleThresholdUsdc ?? IDLE_THRESHOLD;
  const minLevelUsdc = opts.minLevelUsdc ?? MIN_LEVEL_USDC;
  const maxOpenOrders = opts.maxOpenOrders ?? MAX_OPEN_ORDERS;
  const initialLevelsPerPair =
    opts.initialLevelsPerPair ?? DEFAULT_INITIAL_LEVELS_PER_PAIR;

  try {
    // 1) Nøkler: hent + dekrypter (AES-256-GCM via ENCRYPTION_KEY)
    const keys = await db.fetchKrakenKeys(userId);
    if (!keys) return { ok: false, userId, error: "no_kraken_keys" };

    const apiKey = await decryptApiKey(keys.api_key_encrypted);
    const apiSecret = await decryptApiKey(keys.api_secret_encrypted);
    const client = new KrakenClient(apiKey, apiSecret);

    // 2) Eksisterende autopilot-state (grid-levels er SSoT for ordre-lista)
    const state = await db.fetchAutopilotState(userId);
    const firstRun = !state;
    // Normaliser pair-navn: eldre state kan ha BTCUSDC (gammel konvensjon) —
    // Kraken/config bruker XBTUSDC. Uten dette ser orkestratoren XBTUSDC som
    // tomt og plasserer duplikatnivåer → EOrder:Insufficient funds.
    const normalizePair = (p: string) =>
      p === "BTCUSDC" ? "XBTUSDC" : p;
    const gridLevels: Record<string, PersistedGridOrder[]> = Object.fromEntries(
      Object.entries(state?.grid_levels ?? {}).map(([pair, orders]) => [
        normalizePair(pair),
        orders.map((o) => ({ ...o, pair: normalizePair(o.pair) })),
      ]),
    );
    const priorInitialEquity = state?.initial_equity_usdc ?? 0;
    const priorFivePair = state?.five_pair_activated ?? false;

    // 3) Scan: balanse + ticker for de parene brukeren kan ha posisjoner på
    const portfolio = await scanPortfolio(client, eligiblePairs(priorFivePair));
    const equityUsdc = portfolio.equityUsdc;

    // 4) Allokering (ren, ingen side-effekter)
    const allocation = allocateCapital(equityUsdc);

    // 5) Kill-switch FØR grid — progresiv drawdown (7 % → halvert, 15 % → kill)
    //    Første kjøring: initial_equity seedes til dagens equity → drawdown 0.
    const seededInitialEquity =
      priorInitialEquity > 0 ? priorInitialEquity : equityUsdc;
    const drawdown = evaluateProgressiveDrawdown({
      equityUsdc,
      initialEquityUsdc: seededInitialEquity,
    });

    const wasKilled = state?.drawdown_kill === true;
    const killTriggered = !wasKilled && drawdown.shouldKill;
    const killed = wasKilled || drawdown.shouldKill;

    if (killed) {
      // Kanseller ALLE åpne ordrer ved utløsning (brukerens egen Kraken-konto —
      // per-bruker-isolasjon er strukturell). Ved allerede-aktiv kill skjer
      // kanselleringen kun én gang (ordrene er borte).
      let cancelledOrders = 0;
      if (killTriggered) {
        const openKill = await client.getOpenOrders();
        const killOrders =
          ((openKill as Record<string, unknown>)?.open as Record<
            string,
            unknown
          >) ?? {};
        for (const txid of Object.keys(killOrders)) {
          try {
            await client.cancelOrder(txid);
            cancelledOrders++;
          } catch (error) {
            console.error(
              `Autopilot kill: kansellering ${txid} feilet:`,
              error,
            );
          }
        }
      }

      await db.saveAutopilotState(userId, {
        activated: true,
        current_equity_usdc: equityUsdc,
        drawdown_kill: true,
        five_pair_activated: priorFivePair,
        grid_levels: gridLevels,
        initial_equity_usdc: seededInitialEquity,
        realized_profit_usdc: state?.realized_profit_usdc ?? 0,
        total_fills: state?.total_fills ?? 0,
        last_fill_at: state?.last_fill_at ?? null,
        last_run: new Date().toISOString(),
      });

      return {
        ok: true,
        userId,
        firstRun,
        portfolio,
        allocation,
        drawdown,
        killTriggered,
        killed,
        cancelledOrders,
        fills: 0,
        realizedProfitUsdc: 0,
        reinvestedUsdc: 0,
        idleLevelsPlaced: 0,
        newOrdersPlaced: 0,
        fivePairActivated: priorFivePair,
      };
    }

    // 6) 5-par-aktivering ved equity ≥ 250 (idempotent)
    const fivePairActivated =
      priorFivePair || shouldActivateFivePair(equityUsdc, priorFivePair);

    // Par å operere: allokerte par + par med eksisterende ordrer (posisjoner
    // må betjenes selv om de ikke lenger er allokert). Kun par med PAIR_CFG.
    const operatePairs = [
      ...new Set([
        ...allocation.map((a) => a.pair),
        ...Object.keys(gridLevels),
      ]),
    ].filter((p) => PAIR_CFG_LOOKUP[p] !== undefined);

    // 7) Per par: grid-tick (fills → trailing-salg / re-kjøp) eller første
    //    kjørings-nivåer under nåpris
    const prices: Record<string, number> = {};
    const pairSpacing: Record<string, number> = {};
    let fills = 0;
    let realizedProfitUsdc = 0;
    let newOrdersPlaced = 0;
    let idleLevelsPlaced = 0;

    const openOrdersResp = await client.getOpenOrders();
    const openOrdersMap =
      ((openOrdersResp as Record<string, unknown>)?.open as Record<
        string,
        unknown
      >) ?? {};
    const openTxids = new Set(Object.keys(openOrdersMap));

    for (const pair of operatePairs) {
      const cfg = PAIR_CFG_LOOKUP[pair]!;
      const ticker = await client.getTicker(pair);
      const currentPrice = parseFloat(ticker?.c?.[0] ?? "0") || 0;
      const high24h = parseFloat(ticker?.h?.[1] ?? "0") || 0;
      const low24h = parseFloat(ticker?.l?.[1] ?? "0") || 0;
      prices[pair] = currentPrice;

      // Dynamisk spacing basert på 24h-volatilitet
      const dynamicSpacing = computeDynamicSpacing({
        baseSpacing: cfg.spacing,
        high24h,
        low24h,
      });
      pairSpacing[pair] = dynamicSpacing;

      const persisted = gridLevels[pair] ?? [];

      if (persisted.length === 0) {
        // Første kjøring for paret: legg kjøpsnivåer under nåpris (allokert kapital)
        const alloc = allocation.find((a) => a.pair === pair);
        const capitalUsdc =
          alloc?.capitalUsdc ?? minLevelUsdc * initialLevelsPerPair;
        const levels = buildInitialBuyLevels({
          pair,
          currentPrice,
          capitalUsdc,
          spacing: dynamicSpacing,
          levels: initialLevelsPerPair,
          minLevelUsdc,
          levelSizeMultiplier: drawdown.levelSizeMultiplier,
        });

        for (const lv of levels) {
          if (openTxids.size + newOrdersPlaced >= maxOpenOrders) break;
          try {
            const res = await client.limitBuy(
              pair,
              lv.volume,
              lv.price.toFixed(cfg.dec),
            );
            gridLevels[pair] = [
              ...(gridLevels[pair] ?? []),
              {
                txid: res.txid[0],
                side: "buy",
                pair,
                price: lv.price,
                volume: lv.volume,
                status: "open",
                placedAt: new Date().toISOString(),
              },
            ];
            newOrdersPlaced++;
          } catch (error) {
            console.error(
              `Autopilot init-nivå ${pair} @ ${lv.price} feilet:`,
              error,
            );
          }
        }
        continue;
      }

      // Eksisterende ordrer: fill-deteksjon + motsatt ordre (state-løs tick)
      const result = await runGridTick(client, pair, { orders: persisted });
      gridLevels[pair] = result.orders;
      fills += result.fills;
      realizedProfitUsdc += result.realizedProfitUsdc;
      newOrdersPlaced += result.sellOrdersPlaced + result.rebuysPlaced;
    }

    // 7b) DCA-fallback: hvis grid ikke produserer fills, gjør ett DCA-kjøp
    //      per tick så kontoen alltid akkumulerer posisjoner.
    let dcaAmount = 0;
    if (fills === 0 && !firstRun) {
      const needsDca = shouldFallbackToDCA({
        lastFillAt: state?.last_fill_at ?? null,
        totalFills: state?.total_fills ?? 0,
        firstRunAt: state?.created_at ?? null,
      });

      if (needsDca) {
        const dcaPair = pickDcaPair(operatePairs, gridLevels, prices);
        if (dcaPair) {
          const dcaOrder = computeDcaOrder(
            dcaPair,
            prices[dcaPair] ?? 0,
            portfolio.freeUsdc,
          );
          if (dcaOrder && openTxids.size + newOrdersPlaced < maxOpenOrders) {
            try {
              const cfg = PAIR_CFG_LOOKUP[dcaPair]!;
              const res = await client.limitBuy(
                dcaPair,
                dcaOrder.volume,
                prices[dcaPair].toFixed(cfg.dec),
              );
              gridLevels[dcaPair] = [
                ...(gridLevels[dcaPair] ?? []),
                {
                  txid: res.txid[0],
                  side: "buy",
                  pair: dcaPair,
                  price: prices[dcaPair],
                  volume: dcaOrder.volume,
                  status: "open",
                  placedAt: new Date().toISOString(),
                },
              ];
              dcaAmount = dcaOrder.amountUsdc;
              newOrdersPlaced++;
            } catch (error) {
              console.error(`Autopilot DCA ${dcaPair} feilet:`, error);
            }
          }
        }
      }
    }

    // 8) Reinvestering: 80 % av denne kjøringens gevinst > 10 USDC → ny
    //    idle-kapital (B3-regelen; per-kjørings-delta, aldri re-compound av
    //    gammel gevinst). Beløpet er allerede USDC på kontoen — legges til
    //    poolen for nye grid-nivåer.
    const reinvest = computeReinvest(realizedProfitUsdc);
    const reinvestedUsdc = reinvest.shouldReinvest ? reinvest.amount : 0;

    // Ledig til nye nivåer = balanse-USDC minus låst i åpne kjøpsordrer, + reinvestert
    const lockedUsdc = Object.values(gridLevels)
      .flat()
      .filter(
        (o) =>
          o.side === "buy" &&
          o.status === "open" &&
          o.txid &&
          openTxids.has(o.txid),
      )
      .reduce((sum, o) => sum + o.price * (parseFloat(o.volume) || 0), 0);
    const freeForLevels =
      Math.max(0, portfolio.freeUsdc - lockedUsdc) + reinvestedUsdc;

    // 9) Idle-kapital > terskel → nytt kjøpsnivå på par med minst gap
    if (
      freeForLevels > idleThresholdUsdc &&
      openTxids.size + newOrdersPlaced < maxOpenOrders
    ) {
      const idlePick = pickIdlePair(operatePairs, gridLevels, prices);
      if (idlePick) {
        const cfg = PAIR_CFG_LOOKUP[idlePick.pair]!;
        const newPrice = +(
          idlePick.lowest *
          (1 - (pairSpacing[idlePick.pair] ?? cfg.spacing))
        ).toFixed(cfg.dec);
        const pool = Math.max(0, freeForLevels - 1);
        // Task 4b: progressiv drawdown halverer nye nivåer ved 7–15 % drawdown
        const levelUsdc = Math.min(
          pool,
          Math.max(
            minLevelUsdc * drawdown.levelSizeMultiplier,
            freeForLevels * 0.5 * drawdown.levelSizeMultiplier,
          ),
        );
        const volume = (levelUsdc / newPrice).toFixed(8).replace(/\.?0+$/, "");

        if (levelUsdc > 0 && parseFloat(volume) >= cfg.ordremin * 1.1) {
          try {
            const res = await client.limitBuy(
              idlePick.pair,
              volume,
              newPrice.toFixed(cfg.dec),
            );
            gridLevels[idlePick.pair] = [
              ...(gridLevels[idlePick.pair] ?? []),
              {
                txid: res.txid[0],
                side: "buy",
                pair: idlePick.pair,
                price: newPrice,
                volume,
                status: "open",
                placedAt: new Date().toISOString(),
              },
            ];
            idleLevelsPlaced++;
            newOrdersPlaced++;
          } catch (error) {
            console.error(
              `Autopilot idle-nivå ${idlePick.pair} feilet:`,
              error,
            );
          }
        }
      }
    }

    // 10) UPSERT autopilot_state (service-role)
    const realizedTotal =
      (state?.realized_profit_usdc ?? 0) + realizedProfitUsdc;
    await db.saveAutopilotState(userId, {
      activated: true,
      current_equity_usdc: equityUsdc,
      drawdown_kill: false,
      five_pair_activated: fivePairActivated,
      grid_levels: gridLevels,
      initial_equity_usdc: seededInitialEquity,
      realized_profit_usdc: realizedTotal,
      total_fills: (state?.total_fills ?? 0) + fills,
      last_fill_at:
        fills > 0 ? new Date().toISOString() : (state?.last_fill_at ?? null),
      last_run: new Date().toISOString(),
    });

    return {
      ok: true,
      userId,
      firstRun,
      portfolio,
      allocation,
      drawdown,
      killTriggered: false,
      killed: false,
      cancelledOrders: 0,
      fills,
      realizedProfitUsdc,
      reinvestedUsdc,
      idleLevelsPlaced,
      newOrdersPlaced,
      dcaAmount,
      fivePairActivated,
    };
  } catch (error) {
    // Per-bruker feilisolering: én brukers feil knekker ikke cron-batch-en.
    // Supabase kan kaste plain object (PGRST*) — normaliser til Error-melding.
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : error instanceof Error
          ? error.message
          : "Unknown autopilot error";
    return {
      ok: false,
      userId,
      error: message,
    };
  }
}
