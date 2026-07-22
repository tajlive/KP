/**
 * A/B-testing rammeverk — Supabase-basert, ingen eksterne dependencies.
 *
 * ## Arkitektur
 * - Deterministic variant assignment (MD5-hash av userId/anonId)
 * - Lagrer impressions i `ab_experiments`-tabellen
 * - recordConversion() markerer raden som converted
 * - 50/50 split basert på hash modulo
 *
 * ## Bruk på landing page (client-side)
 * ```ts
 * import { getOrCreateVariantClient, recordConversion } from "@/lib/ab-testing";
 * const { variant, recordImpression } = await getOrCreateVariantClient("landing_hero_2026", anonymousId);
 * // ... show variant-specific content ...
 * recordConversion("landing_hero_2026", variant, anonymousId);
 * ```
 *
 * ## Bruk i admin (server-side)
 * ```ts
 * import { getExperimentStats } from "@/lib/ab-testing";
 * const stats = await getExperimentStats("landing_hero_2026");
 * ```
 */

import type { Database } from "@/types/database.types";

// --- Types ---

export type ExperimentVariant = "A" | "B";

export interface ExperimentStats {
  name: string;
  a: { impressions: number; conversions: number };
  b: { impressions: number; conversions: number };
  totalImpressions: number;
  totalConversions: number;
  aRate: number;
  bRate: number;
  chiSquared: number;
  pValue: number;
  significant: boolean;
}

// --- Deterministic variant assignment ---

/**
 * Deterministisk variant-tildeling basert på MD5-hash av en identifikator.
 * Gir 50/50 split: hash[0..7] % 2 === 0 → A, else B.
 */
export function getVariant(identifier: string): ExperimentVariant {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % 2 === 0 ? "A" : "B";
}

// --- Client-side helpers (browser) ---

/**
 * Henter eller oppretter en anonym ID lagret i localStorage.
 * Fallback til crypto.randomUUID() eller Date.now() + Math.random().
 */
export function getAnonymousId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("ab_anonymous_id");
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("ab_anonymous_id", id);
  }
  return id;
}

/**
 * Henter variant for et eksperiment (client-side).
 * - Hvis userId finnes: deterministic basert på userId
 * - Ellers: deterministic basert på anonymousId
 * - Cacher i localStorage for konsistens
 */
export function getClientVariant(
  testName: string,
  userId?: string | null,
): ExperimentVariant {
  const identifier = userId || getAnonymousId();
  const storageKey = `ab_variant_${testName}`;

  // Sjekk localStorage cache
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(storageKey);
    if (cached === "A" || cached === "B") return cached;
  }

  const variant = getVariant(`${testName}:${identifier}`);

  // Cache i localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey, variant);
  }

  return variant;
}

/**
 * Henter eller oppretter variant på klientsiden, OG logger impression
 * til Supabase. Returnerer variant + en recordImpression-funksjon.
 *
 * Bruk denne på landing page for automatisk logging.
 */
export async function getOrCreateVariantClient(
  testName: string,
  supabase: ReturnType<typeof import("./supabase/client").getSupabaseClient>,
  userId?: string | null,
): Promise<{
  variant: ExperimentVariant;
  recordImpression: () => Promise<void>;
}> {
  const identifier = userId || getAnonymousId();
  const variant = getClientVariant(testName, userId);

  return {
    variant,
    recordImpression: () => recordImpression(testName, variant, supabase, userId),
  };
}

/**
 * Logger en impression (besøk) i ab_experiments-tabellen.
 * Bruker upsert-logikk: oppretter kun hvis ikke allerede finnes.
 */
export async function recordImpression(
  testName: string,
  variant: ExperimentVariant,
  supabase: ReturnType<typeof import("./supabase/client").getSupabaseClient>,
  userId?: string | null,
): Promise<void> {
  try {
    const anonymousId = userId ? undefined : getAnonymousId();

    // Sjekk om raden allerede finnes
    const query = supabase
      .from("ab_experiments")
      .select("id")
      .eq("name", testName)
      .eq("converted", false);

    if (userId) {
      query.eq("user_id", userId);
    } else {
      query.eq("anonymous_id", anonymousId ?? "");
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) return; // Allerede logget

    // Opprett ny rad
    await supabase.from("ab_experiments").insert({
      name: testName,
      variant,
      user_id: userId || null,
      anonymous_id: anonymousId,
      converted: false,
    });
  } catch {
    // Silent fail — A/B logging skal aldri blokkere UX
  }
}

/**
 * Logger en konvertering (f.eks. CTA-klikk → signup).
 */
export async function recordConversion(
  testName: string,
  variant: ExperimentVariant,
  supabase: ReturnType<typeof import("./supabase/client").getSupabaseClient>,
  userId?: string | null,
): Promise<void> {
  try {
    const anonymousId = userId ? undefined : getAnonymousId();

    const query = supabase
      .from("ab_experiments")
      .update({ converted: true })
      .eq("name", testName)
      .eq("variant", variant)
      .eq("converted", false);

    if (userId) {
      query.eq("user_id", userId);
    } else {
      query.eq("anonymous_id", anonymousId ?? "");
    }

    await query;
  } catch {
    // Silent fail
  }
}

// --- Server-side helpers ---

/**
 * Henter statistikk for et eksperiment fra Supabase.
 * Returnerer impressions, conversions, rates og chi-squared-analyse.
 */
export async function getExperimentStats(
  testName: string,
  supabase: ReturnType<typeof import("./supabase/server").createClient>,
): Promise<ExperimentStats> {
  const { data: rows, error } = await supabase
    .from("ab_experiments")
    .select("variant, converted")
    .eq("name", testName);

  if (error || !rows) {
    return {
      name: testName,
      a: { impressions: 0, conversions: 0 },
      b: { impressions: 0, conversions: 0 },
      totalImpressions: 0,
      totalConversions: 0,
      aRate: 0,
      bRate: 0,
      chiSquared: 0,
      pValue: 1,
      significant: false,
    };
  }

  const aImpressions = rows.filter((r) => r.variant === "A").length;
  const bImpressions = rows.filter((r) => r.variant === "B").length;
  const aConversions = rows.filter(
    (r) => r.variant === "A" && r.converted,
  ).length;
  const bConversions = rows.filter(
    (r) => r.variant === "B" && r.converted,
  ).length;

  const totalImpressions = aImpressions + bImpressions;
  const totalConversions = aConversions + bConversions;
  const aRate = aImpressions > 0 ? aConversions / aImpressions : 0;
  const bRate = bImpressions > 0 ? bConversions / bImpressions : 0;

  // Chi-squared test (enkel variant — 1 frihetsgrad)
  const { chiSquared, pValue, significant } = computeChiSquared(
    aImpressions,
    aConversions,
    bImpressions,
    bConversions,
  );

  return {
    name: testName,
    a: { impressions: aImpressions, conversions: aConversions },
    b: { impressions: bImpressions, conversions: bConversions },
    totalImpressions,
    totalConversions,
    aRate,
    bRate,
    chiSquared,
    pValue,
    significant,
  };
}

/**
 * Henter ALLE eksperimenter fra databasen (distinkte navn).
 */
export async function getAllExperiments(
  supabase: ReturnType<typeof import("./supabase/server").createClient>,
): Promise<string[]> {
  const { data } = await supabase
    .from("ab_experiments")
    .select("name");

  if (!data) return [];
  const names = [...new Set(data.map((r) => r.name))];
  return names.sort();
}

// --- Chi-squared test ---

/**
 * Enkel chi-squared test for A/B-testing (1 frihetsgrad).
 * Beregner p-verdi via en approksimasjon (ikke full kumulativ fordeling).
 */
function computeChiSquared(
  aTotal: number,
  aConv: number,
  bTotal: number,
  bConv: number,
): { chiSquared: number; pValue: number; significant: boolean } {
  if (aTotal === 0 || bTotal === 0) {
    return { chiSquared: 0, pValue: 1, significant: false };
  }

  const aNonConv = aTotal - aConv;
  const bNonConv = bTotal - bConv;
  const total = aTotal + bTotal;
  const totalConv = aConv + bConv;
  const totalNonConv = total - totalConv;

  if (totalConv === 0 || totalNonConv === 0) {
    return { chiSquared: 0, pValue: 1, significant: false };
  }

  // Forventede verdier under nullhypotesen
  const eAConv = (aTotal * totalConv) / total;
  const eANonConv = (aTotal * totalNonConv) / total;
  const eBConv = (bTotal * totalConv) / total;
  const eBNonConv = (bTotal * totalNonConv) / total;

  // Chi-squared statistikk
  let chiSquared = 0;
  const observed = [
    { o: aConv, e: eAConv },
    { o: aNonConv, e: eANonConv },
    { o: bConv, e: eBConv },
    { o: bNonConv, e: eBNonConv },
  ];

  for (const { o, e } of observed) {
    if (e > 0) {
      chiSquared += (o - e) ** 2 / e;
    }
  }

  // P-verdi approksimasjon for chi-squared med 1 df
  // Bruker Wilson-Hilferty transformasjon: Z = sqrt(2 * chiSq) - sqrt(2 * df - 1)
  // For df=1: p ≈ P(Z > sqrt(chiSq)) for ensidig, men for A/B bruker vi to-sidig
  // To-sidig p-verdi: 2 * (1 - Φ(sqrt(chiSq))) hvor Φ er standard normalfordeling CDF
  const z = Math.sqrt(chiSquared);
  const pValue = 2 * (1 - normalCDF(z));

  return {
    chiSquared: Math.round(chiSquared * 100) / 100,
    pValue: Math.round(pValue * 10000) / 10000,
    significant: pValue < 0.05,
  };
}

/**
 * Standard normalfordeling CDF (Abramowitz and Stegun approximation).
 * Nøyaktig til ±7.5e-8 — mer enn godt nok for A/B-testing.
 */
function normalCDF(x: number): number {
  if (x < 0) return 1 - normalCDF(-x);
  const b0 = 0.2316419;
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const t = 1 / (1 + b0 * x);
  const phi =
    1 -
    (1 / Math.sqrt(2 * Math.PI)) *
      Math.exp(-(x * x) / 2) *
      (b1 * t + b2 * t ** 2 + b3 * t ** 3 + b4 * t ** 4 + b5 * t ** 5);
  return phi;
}

/** In-memory cache for å unngå dupliserte server-side inserts */
const impressionCache = new Set<string>();
