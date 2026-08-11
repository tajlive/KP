"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

/**
 * PilotDashboard — Variant B «Dagboken» (Tom-valgt design 2026-08-10).
 *
 * ALT er ekte data — ingen falsk UI:
 * - Status:  GET /api/trading/sessions?status=active&mode=paper
 * - Gevinst: GET /api/pilot → analytics.totalPnl (realisert, siste 30 dager)
 * - Saldo:   GET /api/user/profile → paper_balance (paper_accounts er fasit)
 * - Feed:    GET /api/pilot → trades m/ pilot_explanation (vises KUN hvis den finnes)
 * - START:   POST /api/pilot { mode: "pilot", live: false }  (ekte paper-sesjon)
 * - STOPP:   PATCH /api/trading/sessions { all: true, mode: "paper", action: "stop" }
 *
 * Motor-notat: strategien som kjøres er grid (default-ruting, PF 7.42 OOS).
 * COMBO (grid+DCA) kommer i mega-plan Oppgave 2.1.
 */

interface Trade {
  id: string;
  trading_pair: string;
  side: string;
  total_value: number;
  quantity: number;
  realized_pnl: number | null;
  pilot_explanation: string | null;
  created_at: string;
}

interface PilotData {
  aktiv: boolean;
  saldo: number | null;
  totalPnl: number | null;
  trades: Trade[];
  regimePause: { reason: string; at: string } | null;
}

type LastStatus = "laster" | "ok" | "feil" | "utlogget";

const fmtKr = (n: number) =>
  `${n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("no-NO")}`;

const fmtKlokke = (iso: string) =>
  new Date(iso).toLocaleTimeString("no-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });

function dagsgruppe(iso: string): "iDag" | "iGaar" | "dato" {
  const d = new Date(iso);
  const naa = new Date();
  const iDag = new Date(naa.getFullYear(), naa.getMonth(), naa.getDate());
  const iGaar = new Date(iDag.getTime() - 86400000);
  const dag = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dag.getTime() === iDag.getTime()) return "iDag";
  if (dag.getTime() === iGaar.getTime()) return "iGaar";
  return "dato";
}

export default function PilotDashboard() {
  const t = useTranslations("pilotDash");
  const locale = useLocale();
  const [status, setStatus] = useState<LastStatus>("laster");
  const [data, setData] = useState<PilotData | null>(null);
  const [handling, setHandling] = useState<"start" | "stopp" | null>(null);
  const [handlingFeil, setHandlingFeil] = useState<string | null>(null);

  const last = useCallback(async () => {
    setStatus("laster");
    setHandlingFeil(null);
    try {
      const [profilRes, sesjonRes, pilotRes] = await Promise.all([
        fetch("/api/user/profile", { credentials: "same-origin" }),
        fetch("/api/trading/sessions?status=active&mode=paper", {
          credentials: "same-origin",
        }),
        fetch("/api/pilot", { credentials: "same-origin" }),
      ]);

      if (
        profilRes.status === 401 ||
        sesjonRes.status === 401 ||
        pilotRes.status === 401
      ) {
        setStatus("utlogget");
        return;
      }
      if (!profilRes.ok || !sesjonRes.ok || !pilotRes.ok) {
        setStatus("feil");
        return;
      }

      const profil = (await profilRes.json()) as {
        profile?: { paper_balance?: number };
      };
      const sesjoner = (await sesjonRes.json()) as { sessions?: unknown[] };
      const pilot = (await pilotRes.json()) as {
        analytics?: { totalPnl?: number };
        trades?: Trade[];
        regimePause?: { reason: string; at: string } | null;
      };

      setData({
        aktiv: (sesjoner.sessions?.length ?? 0) > 0,
        saldo:
          typeof profil.profile?.paper_balance === "number"
            ? profil.profile.paper_balance
            : null,
        totalPnl:
          typeof pilot.analytics?.totalPnl === "number"
            ? pilot.analytics.totalPnl
            : null,
        trades: pilot.trades ?? [],
        regimePause: pilot.regimePause ?? null,
      });
      setStatus("ok");
    } catch {
      setStatus("feil");
    }
  }, []);

  useEffect(() => {
    void last();
  }, [last]);

  async function startPiloten() {
    setHandling("start");
    setHandlingFeil(null);
    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "pilot", live: false }),
      });
      if (!res.ok) {
        setHandlingFeil("startFeil");
      } else {
        await last();
      }
    } catch {
      setHandlingFeil("startFeil");
    } finally {
      setHandling(null);
    }
  }

  async function stoppPiloten() {
    setHandling("stopp");
    setHandlingFeil(null);
    try {
      const res = await fetch("/api/trading/sessions", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, mode: "paper", action: "stop" }),
      });
      if (!res.ok) {
        setHandlingFeil("stoppFeil");
      } else {
        await last();
      }
    } catch {
      setHandlingFeil("stoppFeil");
    } finally {
      setHandling(null);
    }
  }

  /* ── UTLOGGET ── */
  if (status === "utlogget") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-kp-bg-primary px-6">
        <div className="max-w-md text-center">
          <h1 className="text-heading-sm font-black text-kp-text-primary sm:text-heading">
            {t("loginTittel")}
          </h1>
          <p className="mt-3 text-body text-kp-text-secondary">
            {t("loginTekst")}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/${locale}/innlogging`}
              className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border border-kp-border bg-kp-bg-secondary px-8 text-lg font-bold text-kp-text-primary"
            >
              {t("loginKnapp")}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-green-500 px-8 text-lg font-extrabold text-[#06280f]"
            >
              {t("registerKnapp")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── FEIL (ærlig — aldri falsk suksess) ── */
  if (status === "feil") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-kp-bg-primary px-6">
        <div className="max-w-md text-center">
          <h1 className="text-heading-sm font-black text-kp-text-primary">
            {t("feilTittel")}
          </h1>
          <p className="mt-3 text-body text-kp-text-secondary">
            {t("feilTekst")}
          </p>
          <button
            type="button"
            onClick={() => void last()}
            className="mt-8 inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-kp-brand px-8 text-lg font-bold text-white"
          >
            {t("provIgjen")}
          </button>
        </div>
      </div>
    );
  }

  /* ── LASTER ── */
  if (status === "laster" || !data) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-kp-bg-primary">
        <p className="animate-pulse text-lg text-kp-text-muted">
          {t("laster")}
        </p>
      </div>
    );
  }

  const { aktiv, saldo, totalPnl, trades, regimePause } = data;

  // Regime-pause-kort: Piloten er AKTIV men venter (markedet er for urolig).
  // Vises i stedet for «Ingen handler ennå» — ærlig forklaring på hvorfor
  // ingenting skjer (K3 nattstatus §6.2, 2026-08-11).
  const viserVenterKort = aktiv && trades.length === 0 && regimePause !== null;
  // Pause-banner OGSÅ når historikk finnes (2026-08-11): pausen er GJELDENDE
  // tilstand, ikke bare tomtilstand — ellers ser brukere med gamle handler
  // aldri forklaringen på hvorfor Piloten venter.
  const viserPauseBanner = aktiv && trades.length > 0 && regimePause !== null;

  // Grupper feed per dag
  const grupper = new Map<string, Trade[]>();
  for (const trade of trades) {
    const gruppe = dagsgruppe(trade.created_at);
    const nøkkel =
      gruppe === "dato"
        ? new Date(trade.created_at).toLocaleDateString("no-NO", {
            day: "numeric",
            month: "long",
          })
        : t(gruppe);
    const liste = grupper.get(nøkkel) ?? [];
    liste.push(trade);
    grupper.set(nøkkel, liste);
  }

  return (
    <div className="bg-kp-bg-primary text-kp-text-primary">
      {/* FAST TOPP: status + gevinst alltid synlig (Variant B) */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-kp-border bg-kp-bg-primary/90 px-4 py-4 backdrop-blur-md sm:px-6">
        <span
          className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-extrabold ${
            aktiv
              ? "border-green-500/50 bg-green-500/10 text-green-400"
              : "border-kp-border bg-kp-bg-secondary text-kp-text-muted"
          }`}
          role="status"
        >
          <span
            className={`h-3 w-3 rounded-full ${aktiv ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,.7)]" : "bg-kp-text-muted"}`}
            aria-hidden
          />
          {aktiv ? t("statusActive") : t("statusStopped")}
        </span>
        <div className="text-right">
          {totalPnl !== null && (
            <p
              data-testid="pilot-gevinst"
              className={`text-2xl font-extrabold leading-tight tabular-nums ${totalPnl >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {totalPnl >= 0 ? "+" : ""}
              {fmtKr(totalPnl)} kr
            </p>
          )}
          {saldo !== null && (
            <p data-testid="pilot-saldo" className="text-xs text-kp-text-muted">
              {t("saldoLabel")}: {fmtKr(saldo)} kr · {t("lekepenger")}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-40 pt-6 sm:px-6">
        {/* DAGBOK-FEED */}
        {viserVenterKort ? (
          <div className="mt-10 text-center">
            <p className="text-5xl" aria-hidden>
              🌊
            </p>
            <h2 className="mt-4 text-heading-sm font-black text-kp-text-primary">
              {t("venterTittel")}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-body text-kp-text-secondary">
              {t("venterTekst")}
            </p>
            {regimePause && (
              <p className="mx-auto mt-4 max-w-sm rounded-2xl border border-kp-border bg-kp-bg-secondary px-4 py-3 text-sm text-kp-text-muted">
                {regimePause.reason}
              </p>
            )}
          </div>
        ) : trades.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-5xl" aria-hidden>
              🧑‍✈️
            </p>
            <h2 className="mt-4 text-heading-sm font-black text-kp-text-primary">
              {t("feedEmptyTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-body text-kp-text-secondary">
              {t("feedEmpty")}
            </p>
          </div>
        ) : (
          <>
            {/* Pause-banner øverst i feeden når Piloten venter pga. markedet */}
            {viserPauseBanner && (
              <div className="mt-4 rounded-2xl border border-yellow-500/40 bg-yellow-500/[0.07] p-4">
                <p className="font-bold text-kp-text-primary">
                  🌊 {t("venterTittel")}
                </p>
                <p className="mt-1 text-sm text-kp-text-secondary">
                  {regimePause.reason}
                </p>
              </div>
            )}
            {Array.from(grupper.entries()).map(([dag, liste]) => (
            <section key={dag}>
              <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-kp-text-muted">
                {dag}
              </p>
              {liste.map((trade) => {
                const erKjop = trade.side === "BUY";
                const pnl = trade.realized_pnl;
                return (
                  <article
                    key={trade.id}
                    className="mb-3 flex gap-4 rounded-3xl border border-kp-border bg-kp-bg-secondary p-5"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${
                        erKjop ? "bg-green-500/15" : "bg-brand-500/15"
                      }`}
                      aria-hidden
                    >
                      {erKjop ? "🛒" : "💰"}
                    </div>
                    <div className="min-w-0">
                      {trade.pilot_explanation ? (
                        <p className="text-base font-semibold leading-snug text-kp-text-primary">
                          «{trade.pilot_explanation}»
                        </p>
                      ) : (
                        <p className="text-base font-semibold text-kp-text-primary">
                          {erKjop ? t("kjop") : t("salg")} ·{" "}
                          {trade.trading_pair.replace("USDT", "")}
                        </p>
                      )}
                      <p
                        data-testid={`feed-belop-${trade.id}`}
                        className={`mt-1 text-sm font-bold tabular-nums ${
                          pnl !== null && pnl !== undefined
                            ? pnl >= 0
                              ? "text-green-500"
                              : "text-red-500"
                            : "text-kp-text-secondary"
                        }`}
                      >
                        {pnl !== null && pnl !== undefined
                          ? `${pnl >= 0 ? "+" : ""}${fmtKr(pnl)} kr`
                          : `${erKjop ? t("kjopteFor") : t("solgteFor")} ${fmtKr(trade.total_value)} kr`}
                      </p>
                      <p className="mt-0.5 text-xs text-kp-text-muted">
                        kl. {fmtKlokke(trade.created_at)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
          </>
        )}

        {/* Handlings-feil (ærlig melding) */}
        {handlingFeil && (
          <p
            className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-center text-sm font-semibold text-red-400"
            role="alert"
          >
            {t(handlingFeil)}
          </p>
        )}
      </main>

      {/* FAST BUNN: én stor knapp + brems-forklaring */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-10 border-t border-kp-border bg-kp-bg-primary/95 backdrop-blur-md px-4 pt-4 sm:px-6"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-xl">
          {aktiv ? (
            <button
              type="button"
              onClick={() => void stoppPiloten()}
              disabled={handling !== null}
              className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-3xl bg-red-500 text-2xl font-extrabold text-white shadow-lg shadow-red-500/25 transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-red-600 active:scale-[0.98] disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              {handling === "stopp" ? t("arbeider") : t("stoppKnapp")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startPiloten()}
              disabled={handling !== null}
              className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-3xl bg-green-500 text-2xl font-extrabold text-[#06280f] shadow-lg shadow-green-500/25 transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-green-600 active:scale-[0.98] disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
            >
              {handling === "start" ? t("arbeider") : t("startKnapp")}
            </button>
          )}
          <p className="mt-2 pb-1 text-center text-xs text-kp-text-muted">
            {t("bremsLinje")}
          </p>
        </div>
      </footer>
    </div>
  );
}
