import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { logAdminAudit } from "@/lib/admin/log-admin-audit";
import { createClient as createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { NextResponse } from "next/server";
import {
  classifyCurrency,
  fetchPriceRefs,
  type TradeRow,
} from "@/lib/admin/trade-health-shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SESSIONS_PER_USER = 12;
const FALLBACK_RATE = 9.7;

/**
 * POST /api/admin/trade-health/fix — kjør auto-fiks fra adminpanelet.
 * Samme logikk som scripts/trade-quality-monitor.mjs --apply:
 *  1. Slett is_mock-rader
 *  2. Konverter USDT-/blandede rader til NOK
 *  3. Slett overflødige inaktive sesjoner (>12/bruker, behold aktive + nyeste)
 *  4. Resync balanse-drift paper_accounts -> user_profiles
 * Alt logges til admin-audit.
 */
export async function POST() {
  const auth = await verifyAdminAccess();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const fixes: Record<string, number | string> = {};
  const warnings: string[] = [];

  try {
    const db = createServiceClient() as SupabaseClient<Database>;

    // 1. Mock-rader
    const { data: mockRows } = await db.from("trades").select("id").eq("is_mock", true);
    if (mockRows?.length) {
      const ids = mockRows.map((r: { id: string }) => r.id);
      for (let i = 0; i < ids.length; i += 100) {
        const { error } = await db.from("trades").delete().in("id", ids.slice(i, i + 100));
        if (error) { warnings.push(`mock: ${error.message}`); break; }
      }
      fixes.mockDeleted = ids.length;
    }

    // 2. Valuta
    let ref = {};
    try { ref = await fetchPriceRefs(); } catch { warnings.push("CoinGecko utilgjengelig — valutafiks hoppet over"); }
    if (Object.keys(ref).length > 0) {
      const { data: rows } = await db
        .from("trades")
        .select("id, user_id, trading_pair, side, quantity, price, total_value, fee, realized_pnl, usdt_nok_rate, is_mock, executed_at")
        .or("is_mock.is.null,is_mock.eq.false");
      let converted = 0, failed = 0;
      for (const t of (rows ?? []) as TradeRow[]) {
        const kind = classifyCurrency(t, ref);
        if (kind !== "full" && kind !== "mixed") continue;
        const rate = Number(t.usdt_nok_rate) > 0 ? Number(t.usdt_nok_rate) : FALLBACK_RATE;
        const price = Number(t.price);
        const upd: Partial<Database["public"]["Tables"]["trades"]["Update"]> = {
          price: Math.round(price * rate * 1e8) / 1e8,
          usdt_nok_rate: rate,
        };
        if (kind === "full") {
          upd.total_value = Math.round(Number(t.total_value) * rate * 100) / 100;
          upd.fee = Math.round(Number(t.fee || 0) * rate * 100) / 100;
          if (t.realized_pnl != null) upd.realized_pnl = Math.round(Number(t.realized_pnl) * rate * 100) / 100;
        }
        const { error } = await db.from("trades").update(upd).eq("id", t.id);
        if (error) { failed++; warnings.push(`valuta ${t.id}: ${error.message}`); } else converted++;
      }
      if (converted || failed) fixes.currencyConverted = `${converted} ok, ${failed} feilet`;
    }

    // 3. Sesjonsproliferasjon
    const { data: sessions } = await db.from("trading_sessions").select("id, user_id, status, created_at");
    const byUser = new Map<string, { id: string; status: string; created_at: string }[]>();
    for (const s of sessions ?? []) {
      const arr = byUser.get(s.user_id) ?? [];
      arr.push(s);
      byUser.set(s.user_id, arr);
    }
    const toDelete: string[] = [];
    for (const arr of byUser.values()) {
      if (arr.length <= MAX_SESSIONS_PER_USER) continue;
      arr.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
      const active = arr.filter((s) => s.status === "active" || s.status === "paused");
      const inactive = arr.filter((s) => s.status !== "active" && s.status !== "paused");
      const keepInactive = Math.max(0, MAX_SESSIONS_PER_USER - active.length);
      toDelete.push(...inactive.slice(0, Math.max(0, inactive.length - keepInactive)).map((s) => s.id));
    }
    if (toDelete.length > 0) {
      for (let i = 0; i < toDelete.length; i += 200) {
        const { error } = await db.from("trading_sessions").delete().in("id", toDelete.slice(i, i + 200));
        if (error) { warnings.push(`sesjoner: ${error.message}`); break; }
      }
      fixes.sessionsDeleted = toDelete.length;
    }

    // 4. Balanse-drift
    const { data: accounts } = await db.from("paper_accounts").select("user_id, current_balance");
    const { data: profiles } = await db.from("user_profiles").select("id, paper_balance");
    const profMap = new Map<string, number>(
      (profiles ?? []).map((p: { id: string; paper_balance: number }): [string, number] => [p.id, Number(p.paper_balance)]),
    );
    let resynced = 0;
    for (const a of (accounts ?? []) as { user_id: string; current_balance: number }[]) {
      const pb = profMap.get(a.user_id);
      if (pb != null && Math.abs(pb - Number(a.current_balance)) > 0.01) {
        await db.from("user_profiles").update({ paper_balance: a.current_balance }).eq("id", a.user_id);
        resynced++;
      }
    }
    if (resynced > 0) fixes.balanceResynced = resynced;

    await logAdminAudit(db, {
      admin_user_id: auth.userId,
      action: "trade_health_fix",
      payload: { fixes, warnings, actor: auth.email ?? null },
    });

    return NextResponse.json({ ok: warnings.length === 0, fixes, warnings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
