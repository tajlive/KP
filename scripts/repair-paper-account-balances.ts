/**
 * Reparerer paper_accounts.current_balance fra trading_sessions.
 *
 * Bakgrunn: Valuta-buggen (orphan-adopsjon + highest_price-tracking, 2026-08-02→03)
 * førte til at current_balance ble trukket for kjøp uten at posisjoner ble
 * riktig verdsatt. Korrekt balance = sum over AKTIVE paper-sesjoner av
 * (current_capital_nok [cash] + open_position.quantity * coin_prices.price [posisjonsverdi]).
 *
 * Bruk:
 *   npx tsx scripts/repair-paper-account-balances.ts                  # full kjøring
 *   npx tsx scripts/repair-paper-account-balances.ts --dry-run         # dry-run (ingen endringer)
 *   npx tsx scripts/repair-paper-account-balances.ts --dry-run --user=test+tricky+123@klarpakke.no
 */
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export interface OpenPosition {
  quantity: number | string;
  entry_price: number | string;
  [key: string]: unknown;
}

export interface Session {
  current_capital_nok: number | string;
  open_position: OpenPosition | null;
  trading_pair: string;
}

export type CoinPrices = Record<string, number | string>;

const toNum = (v: number | string | null | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Normaliserer trading_pair ("BTC/USDT" → "BTCUSDT") mot coin_prices.symbol. */
export function normalizeSymbol(pair: string): string {
  return pair.replace(/\//g, "").toUpperCase();
}

/**
 * Beregner korrekt balance: cash (current_capital_nok) + posisjonsverdi
 * (open_position.quantity × markedspris). Manglende markedspris faller
 * tilbake til entry_price.
 */
export function calculateCorrectBalance(
  sessions: Session[],
  coinPrices: CoinPrices,
): number {
  let total = 0;
  for (const session of sessions) {
    total += toNum(session.current_capital_nok);

    if (session.open_position) {
      const marketPrice =
        toNum(coinPrices[normalizeSymbol(session.trading_pair)]) ||
        toNum(session.open_position.entry_price);
      total += toNum(session.open_position.quantity) * marketPrice;
    }
  }
  return Math.round(total * 100) / 100;
}

/** Skal balansen repareres? Ja hvis avviket overstiger terskelen (default 100 NOK). */
export function shouldRepair(
  current: number,
  correct: number,
  threshold = 100,
): boolean {
  return Math.abs(correct - current) > threshold;
}

interface AuthUser {
  id: string;
  email: string;
}

/** Henter auth-brukere (id + e-post) via GoTrue admin-endepunktet. */
async function fetchAuthUsers(url: string, key: string): Promise<AuthUser[]> {
  const allUsers: AuthUser[] = [];
  let page = 1;
  const perPage = 1000;
  
  while (true) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` },
    });
    if (!res.ok) {
      throw new Error(`auth.users: HTTP ${res.status}`);
    }
    const data = (await res.json()) as { users?: Array<{ id: string; email: string | null }> };
    const users = (data.users ?? [])
      .filter((u) => u.email)
      .map((u) => ({ id: u.id, email: u.email as string }));
    
    allUsers.push(...users);
    
    // Stopp hvis vi fikk færre enn perPage (siste side)
    if (users.length < perPage) break;
    page++;
  }
  
  return allUsers;
}

export interface RepairOptions {
  /** Skriv ingen endringer, bare logg hva som ville blitt gjort. */
  dryRun?: boolean;
  /** Begrens til én bruker (e-post). */
  userEmail?: string;
  /** Avviksterskel i NOK (default 100). */
  threshold?: number;
}

export interface RepairResult {
  scanned: number;
  repaired: number;
  skipped: number;
  errors: number;
}

export async function repairAllBalances(
  options: RepairOptions = {},
): Promise<RepairResult> {
  const { dryRun = false, userEmail, threshold = 100 } = options;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Mangler NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — last inn .env.local",
    );
  }
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Coin-priser ÉN gang (ikke per bruker)
  const { data: prices, error: priceErr } = await supabase
    .from("coin_prices")
    .select("symbol, price");
  if (priceErr) throw new Error(`coin_prices: ${priceErr.message}`);

  const coinPrices: CoinPrices = {};
  for (const p of (prices ?? []) as Array<{ symbol: string; price: number | string }>) {
    coinPrices[p.symbol] = p.price;
  }

  // 2. E-post-oppslag for lesbar logging + --user-filter.
  // NB: supabase-js auth.admin.listUsers() gir 500 fra GoTrue (verifisert),
  // så vi kaller admin-endepunktet direkte (fungerer, curl-verifisert).
  const authUsers = await fetchAuthUsers(url, key);
  const emailById = new Map<string, string>();
  for (const u of authUsers) emailById.set(u.id, u.email);

  // 3. Velg konto(er)
  let query = supabase.from("paper_accounts").select("user_id, current_balance");
  if (userEmail) {
    const target = [...emailById.entries()].find(([, email]) => email === userEmail);
    if (!target) throw new Error(`Fant ikke bruker med e-post: ${userEmail}`);
    query = query.eq("user_id", target[0]);
  }
  const { data: accounts, error: accErr } = await query;
  if (accErr) throw new Error(`paper_accounts: ${accErr.message}`);

  // 4. Beregn og reparer
  const result: RepairResult = { scanned: 0, repaired: 0, skipped: 0, errors: 0 };

  for (const account of (accounts ?? []) as Array<{
    user_id: string;
    current_balance: number | string;
  }>) {
    result.scanned++;
    try {
      const { data: sessions, error: sErr } = await supabase
        .from("trading_sessions")
        .select("current_capital_nok, open_position, trading_pair")
        .eq("user_id", account.user_id)
        .eq("mode", "paper")
        .eq("status", "active");
      if (sErr) throw sErr;

      const correct = calculateCorrectBalance(
        (sessions ?? []) as Session[],
        coinPrices,
      );
      const current = toNum(account.current_balance);

      if (!shouldRepair(current, correct, threshold)) {
        result.skipped++;
        continue;
      }

      const email = emailById.get(account.user_id);
      const delta = correct - current;
      console.log(
        `ℹ️  ${email ?? account.user_id}: ${current.toFixed(2)} → ${correct.toFixed(2)} NOK (avvik ${delta >= 0 ? "+" : ""}${delta.toFixed(2)})${dryRun ? " [DRY-RUN]" : ""}`,
      );

      if (!dryRun) {
        const { error: upErr } = await supabase
          .from("paper_accounts")
          .update({ current_balance: correct })
          .eq("user_id", account.user_id);
        if (upErr) throw upErr;
      }
      result.repaired++;
    } catch (e) {
      result.errors++;
      console.error(
        `❌ ${account.user_id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return result;
}

// CLI-kjøring (kun når filen kjøres direkte — ikke ved import i tester)
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const { config } = await import("dotenv");
  config({ path: ".env.local" });

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const userArg = args.find((a) => a.startsWith("--user="));
  const userEmail = userArg?.slice("--user=".length);

  try {
    const r = await repairAllBalances({ dryRun, userEmail });
    console.log(
      `\n✅ Ferdig: scannet ${r.scanned}, reparert ${r.repaired}, uendret ${r.skipped}, feil ${r.errors}${dryRun ? " (DRY-RUN — ingen endringer skrevet)" : ""}`,
    );
    process.exit(r.errors > 0 ? 1 : 0);
  } catch (e) {
    console.error("❌", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
