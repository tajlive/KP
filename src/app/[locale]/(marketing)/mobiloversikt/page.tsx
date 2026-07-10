import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Mobiloversikt — Klarpakke",
    description: "Mobil-testresultater for Klarpakkes offentlige sider",
  };
}

// ── Types ──────────────────────────────────────────────────────────────

interface PageResult {
  route: string;
  status: "pass" | "fail";
  horizontalOverflow: boolean;
  offScreenElements: number;
  smallTouchTargets: number;
  errors: string[];
  screenshot?: string;
}

interface AuditResults {
  issues: PageResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    overflowCount: number;
    offScreenCount: number;
    smallTouchCount: number;
    timestamp: string;
  };
}

// ── Loading results ────────────────────────────────────────────────────

async function loadResults(): Promise<AuditResults | null> {
  try {
    const filePath = path.join(process.cwd(), "public/mobile-audit/results.json");
    const data = await fs.readFile(filePath, "utf-8");
    const results: PageResult[] = JSON.parse(data);
    const issues = results.filter((r) => r.status === "fail");
    return {
      issues,
      summary: {
        total: results.length,
        passed: results.filter((r) => r.status === "pass").length,
        failed: issues.length,
        overflowCount: results.filter((r) => r.horizontalOverflow).length,
        offScreenCount: results.filter((r) => r.offScreenElements > 20).length,
        smallTouchCount: results.filter((r) => r.smallTouchTargets > 0).length,
        timestamp: new Date().toISOString(),
      },
    };
  } catch {
    return null;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatRoute(route: string): string {
  return route.replace("/no", "") || "/ (Hjem)";
}

function routeLabel(route: string): string {
  const labels: Record<string, string> = {
    "/no": "Hjem",
    "/no/priser": "Priser",
    "/no/priser/success": "Priser – Suksess",
    "/no/priser/cancel": "Priser – Avbrutt",
    "/no/om-oss": "Om oss",
    "/no/kontakt": "Kontakt",
    "/no/hjelp": "Hjelp",
    "/no/kalkulator": "Kalkulator",
    "/no/bots": "Trading Bots",
    "/no/binance-guide": "Binance-guide",
    "/no/vilkar": "Vilkår",
    "/no/personvern": "Personvern",
    "/no/cookies": "Cookies",
    "/no/login": "Logg inn",
    "/no/register": "Registrer",
    "/no/reset-password": "Tilbakestill passord",
    "/no/update-password": "Oppdater passord",
    "/no/jokertrade": "JokerTrade",
    "/no/leaderboard": "Ledertavle",
    "/no/copy-trading": "Copy Trading",
    "/no/copy-trading/discover": "Copy Trading – Oppdag",
    "/no/akademi": "Akademi",
    "/no/akademi/dashboard-guide": "Dashboard-guide",
    "/no/kurs": "Kurs",
    "/no/kurs/grunnleggende/leksjon/introduksjon-til-krypto": "Grunnleggende leksjon",
    "/no/kurs/strategi/leksjon/dollar-cost-averaging": "DCA-strategi",
    "/no/checkout": "Checkout",
    "/no/checkout/success": "Checkout – Suksess",
    "/no/marketplace": "Marked",
    "/no/velkommen": "Velkommen",
    "/no/velg-strategi": "Velg strategi",
    "/no/feil/ikke-funnet": "404 – Ikke funnet",
    "/no/feil/ingen-tilgang": "403 – Ingen tilgang",
    "/no/feil/serverfeil": "500 – Serverfeil",
  };
  return labels[route] || route;
}

// ── Severity badge ─────────────────────────────────────────────────────

function SeverityBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1D26] border border-[#2A2D35]`}>
      <span className="text-sm font-semibold" style={{ color }}>
        {count}
      </span>
      <span className="text-xs text-[#9CA3AF]">{label}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default async function MobiloversiktPage() {
  const data = await loadResults();

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-[#F9FAFB]">
      {/* Header */}
      <header className="border-b border-[#2A2D35] bg-[#15171B]">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📱</span>
            <h1 className="text-xl font-bold">Mobil-audit rapport</h1>
          </div>
          <p className="text-sm text-[#9CA3AF]">
            Automatisk test av alle offentlige ruter i 375×667 mobil-viewport
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!data ? (
          /* ── Ingen data ── */
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-lg font-semibold mb-2">Ingen testresultater</h2>
            <p className="text-sm text-[#9CA3AF] mb-6">
              Kjør mobil-audit-testen først for å se resultater.
            </p>
            <code className="block bg-[#15171B] border border-[#2A2D35] rounded-lg px-4 py-3 text-xs font-mono text-[#3B82F6]">
              npx playwright test --project=chromium e2e/mobile/mobile-audit.spec.ts
            </code>
          </div>
        ) : (
          <>
            {/* ── Sammendrag ── */}
            <section className="mb-8">
              <div className="glass-card p-6">
                <h2 className="text-base font-semibold mb-4">Sammendrag</h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#1A1D26] border border-[#2A2D35] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-[#F9FAFB]">{data.summary.total}</div>
                    <div className="text-xs text-[#9CA3AF] mt-1">Sider testet</div>
                  </div>
                  <div className="bg-[#1A1D26] border border-[#2A2D35] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-[#10B981]">{data.summary.passed}</div>
                    <div className="text-xs text-[#9CA3AF] mt-1">Bestått</div>
                  </div>
                  <div className="bg-[#1A1D26] border border-[#2A2D35] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-[#EF4444]">{data.summary.failed}</div>
                    <div className="text-xs text-[#9CA3AF] mt-1">Problemer oppdaget</div>
                  </div>
                  <div className="bg-[#1A1D26] border border-[#2A2D35] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-[#F59E0B]">
                      {data.summary.total > 0
                        ? Math.round((data.summary.passed / data.summary.total) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-[#9CA3AF] mt-1">Score</div>
                  </div>
                </div>

                {/* Sjekk-detaljer */}
                <div className="flex flex-wrap gap-3">
                  <SeverityBadge count={data.summary.overflowCount} label="Horisontal overflow" color="#EF4444" />
                  <SeverityBadge count={data.summary.offScreenCount} label="Elementer utenfor skjerm" color="#F59E0B" />
                  <SeverityBadge count={data.summary.smallTouchCount} label="Små touch-targets" color="#F59E0B" />
                </div>

                {data.summary.failed > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-[#7F1D1D]/30 border border-[#EF4444]/30 text-sm text-[#FCA5A5]">
                    ⚠️ {data.summary.failed} av {data.summary.total} sider har mobil-problemer
                  </div>
                )}
                {data.summary.failed === 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-[#064E3B]/30 border border-[#10B981]/30 text-sm text-[#6EE7B7]">
                    ✅ Alle {data.summary.total} sider består mobil-testen
                  </div>
                )}
              </div>
            </section>

            {/* ── Sider med feil ── */}
            {data.issues.length > 0 && (
              <section className="mb-8">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <span className="text-[#EF4444]">❌</span>
                  Sider med mobil-problemer ({data.issues.length})
                </h2>

                <div className="space-y-4">
                  {data.issues.map((result) => (
                    <div
                      key={result.route}
                      className="glass-card p-4 sm:p-6"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-sm">
                            {routeLabel(result.route)}
                          </h3>
                          <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                            {result.route}
                          </p>
                        </div>
                        <a
                          href={result.route}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#3B82F6] hover:underline shrink-0 mt-1"
                        >
                          Åpne side →
                        </a>
                      </div>

                      {/* Feilliste */}
                      <div className="space-y-1.5 mb-3">
                        {result.horizontalOverflow && (
                          <div className="flex items-center gap-2 text-xs text-[#EF4444]">
                            <span>⬅️➡️</span>
                            <span>Horisontal scroll — innhold stikker utenfor skjermbredden</span>
                          </div>
                        )}
                        {result.offScreenElements > 20 && (
                          <div className="flex items-center gap-2 text-xs text-[#F59E0B]">
                            <span>🪟</span>
                            <span>{result.offScreenElements} element(er) er delvis utenfor viewport</span>
                          </div>
                        )}
                        {result.smallTouchTargets > 0 && (
                          <div className="flex items-center gap-2 text-xs text-[#F59E0B]">
                            <span>👆</span>
                            <span>
                              {result.smallTouchTargets} touch-target(s) er mindre enn 44×44 CSS pixels
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Screenshot */}
                      {result.screenshot && (
                        <div className="mt-3 border border-[#2A2D35] rounded-xl overflow-hidden">
                          <Image
                            src={result.screenshot.replace(/^public\//, "/").replace(/\.png$/i, ".webp")}
                            alt={`Screenshot av ${result.route}`}
                            width={375}
                            height={667}
                            className="w-full max-w-[375px] mx-auto h-auto"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Alle sider (utvidbar) ── */}
            <section>
              <details className="glass-card p-4 sm:p-6">
                <summary className="text-sm font-semibold cursor-pointer text-[#9CA3AF] hover:text-[#F9FAFB]">
                  📋 Vis alle {data.summary.total} testede sider
                </summary>
                <div className="mt-4 space-y-1">
                  {/* Laste inn data — vi har ikke alle resultatene her, så jeg lagrer dem
                      i en egen JSON-fil. For nå viser vi bare en tabell. */}
                  <p className="text-xs text-[#6B7280] mb-3">
                    Fullstendig testresultat finnes i <code className="text-[#3B82F6]">/mobile-audit/results.json</code>
                  </p>
                </div>
              </details>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2A2D35] py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-[#6B7280]">
          Klarpakke — Mobil-audit · 375×667 viewport · {new Date().toLocaleDateString("nb-NO")}
        </div>
      </footer>
    </div>
  );
}
