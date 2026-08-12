/**
 * API-dokumentasjon — Offentlige API-endepunkter for Klarpakke
 * Static HTML. Zero SSR, zero Worker crashes.
 * Dark glassmorphism med kodeblokker og JSON respons-eksempler.
 */
"use client";

import { useTranslations } from "next-intl";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/health",
    auth: "Ingen",
    description: "Systemhelsesjekk. Returnerer status for database, Kraken-tilkobling, leaderboard, Redis KV, trading-signaler, feilrate, handelsvolum og flere subsystemer. Brukes av Cloudflare-monitorering og intern cron.",
    params: "Ingen",
    response: `{
  "status": "healthy",
  "timestamp": "2026-07-10T12:00:00.000Z",
  "version": "abc1234",
  "checks": {
    "database": { "status": "ok", "latency": 45 },
    "tradingSignals": { "status": "ok", "latency": 32 },
    "kv": { "status": "ok", "latency": 12 },
    "environment": { "status": "ok" },
    "krakenConnectivity": {
      "status": "ok",
      "latency": 140,
      "endpoint": "api.kraken.com"
    },
    "leaderboard": { "status": "ok", "latency": 28, "count": 42 },
    "errorRate": { "status": "ok", "count": 2 },
    "tradesPerMinute": { "status": "ok", "count": 15 }
  },
  "uptime": 847201
}`,
    note: "Caches i 30 sekunder via Redis (hvis konfigurert)."
  },
  {
    method: "GET",
    path: "/api/leaderboard",
    auth: "Ingen",
    description: "Hent topplista over tradere. Returnerer rangerte tradere med avkastning, win rate, antall handler og risikonivå. Sortert på rank stigende.",
    params: "`period` (query, valgfri) — `weekly` (default), `monthly` eller `all_time`",
    response: `{
  "success": true,
  "data": [
    {
      "rank": 1,
      "user_display_name": "KryptoKaptein",
      "return_pct": 34.7,
      "win_rate": 78,
      "total_trades": 45,
      "risk_level": "moderate",
      "badges": ["🚀", "💎"]
    }
  ]
}`,
    note: "Maks 50 tradere per respons. Data hentes fra Supabase REST API med anon key — ingen autentisering nødvendig."
  },
  {
    method: "GET",
    path: "/api/live/feed",
    auth: "Ingen",
    description: "Siste hendelser fra hele plattformen i sanntid. Inkluderer handler, leaderboard-endringer, nye brukere og AI-signaler. Brukes av LiveFeed-widget på Pilot-siden.",
    params: "`limit` (query, valgfri) — antall hendelser (default: 20, maks: 50)",
    response: `{
  "success": true,
  "data": [
    {
      "id": "evt_abc123",
      "type": "trade",
      "title": "🟦 Kjøp BTC/USDT",
      "description": "KryptoKaptein kjøpte 0.01 BTC",
      "user_display_name": "KryptoKaptein",
      "metadata": {
        "trading_pair": "BTC/USDT",
        "side": "buy",
        "quantity": 0.01
      },
      "created_at": "2026-07-10T11:59:00.000Z"
    }
  ]
}`,
    note: "Data hentes fra `live_events`-tabellen. Polling anbefales hvert 15. sekund."
  },
  {
    method: "GET",
    path: "/api/leaderboard/changes",
    auth: "Ingen",
    description: "Sammenligner nåværende leaderboard med siste tatt snapshot. Returnerer hvem som har klatret eller falt på topplista. Brukes av Social Proof-widget for å vise «hvem passerer hvem».",
    params: "`period` (query, valgfri) — `weekly` (default), `monthly` eller `all_time`",
    response: `{
  "success": true,
  "data": [
    {
      "user_id": "usr_abc",
      "user_display_name": "MesterTrader",
      "period": "weekly",
      "old_rank": 5,
      "new_rank": 2,
      "rank_change": 3,
      "return_pct": 22.5,
      "win_rate": 82
    }
  ]
}`,
    note: "Positiv `rank_change` betyr klatring. Negativ = falt. Sortert med størst klatring først."
  },
  {
    method: "GET",
    path: "/api/pilot/notifications",
    auth: "Ingen",
    description: "Returnerer siste Pilot-handler med AI-forklaring. Brukes av PilotPush-widget for å vise «🎭 PilotTrade»-varsler på tvers av plattformen.",
    params: "`limit` (query, valgfri) — antall varsler (default: 20, maks: 50)",
    response: `{
  "success": true,
  "data": [
    {
      "id": "trd_xyz",
      "user_display_name": "KryptoKaptein",
      "title": "🎭 KryptoKaptein — 🟦 Kjøp BTC/USDT",
      "description": "🎭 Pilot: BTC viste bullish flagg med RSI over 60",
      "trading_pair": "BTC/USDT",
      "side": "buy",
      "quantity": 0.05,
      "price": 58742.30,
      "executed_at": "2026-07-10T11:45:00.000Z"
    }
  ]
}`,
    note: "Kun handler med `pilot_trade = true` og en `pilot_explanation` returneres."
  },
  {
    method: "POST",
    path: "/api/pilot",
    auth: "**Påkrevd** — Supabase JWT-session",
    description: "Utløs Pilot-analyse. Hermes AI analyserer markedet og lagrer resultatet i `market_intelligence`. Simulerer AI-generert signal for angitt kryptovaluta.",
    params: "Ingen body-parametere (krever) — genererer tilfeldig signal",
    response: `{
  "success": true,
  "message": "🎭 Pilot-analyse fullført!",
  "signal": {
    "source": "pilot-ai",
    "title": "🎭 Pilot-signal: LONG SOL (78%)",
    "content": "## 🎭 Pilot-analyse\\n\\n**Coin:** SOL\\n**Signal:** LONG\\n**Confidence:** 78%\\n...",
    "sentiment": "bullish",
    "sentiment_score": 0.45,
    "coins": ["SOL"],
    "action": "LONG",
    "confidence": 78,
    "created_at": "2026-07-10T12:00:00.000Z"
  }
}`,
    note: "Krever gyldig Supabase auth-session (settes automatisk ved innlogging). Returnerer 401 hvis uautorisert."
  },
];

const CODE_EXAMPLES = {
  curl: (path: string, method: string, hasAuth: boolean, params?: string) => {
    let cmd = `curl -X ${method} https://www.klarpakke.no${path}`;
    if (hasAuth) {
      cmd += ` \\\n  -H "Authorization: Bearer <din_supabase_token>"`;
    }
    cmd += ` \\\n  -H "Content-Type: application/json"`;
    if (params) {
      cmd += ` \\\n  -G --data-urlencode "${params.split("—")[0].trim().replace(/`/g, "")}"`;
    }
    return cmd;
  },
  fetch: (path: string, method: string, hasAuth: boolean) => {
    let code = `fetch("https://www.klarpakke.no${path}", {\n  method: "${method}",\n  headers: {\n    "Content-Type": "application/json"`;
    if (hasAuth) {
      code += `,\n    "Authorization": \`Bearer \${supabaseSession.access_token}\``;
    }
    code += `\n  }`;

    if (method === "POST") {
      code += `,\n  body: JSON.stringify({})`;
    }

    code += `\n})\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));`;
    return code;
  },
  python: (path: string, method: string, hasAuth: boolean) => {
    let code = `import requests\n\nurl = "https://www.klarpakke.no${path}"\nheaders = {\n    "Content-Type": "application/json"`;
    if (hasAuth) {
      code += `,\n    "Authorization": f"Bearer {supabase_token}"`;
    }
    code += `\n}\n\nresponse = requests.${method.toLowerCase()}(url, headers=headers`;
    if (method === "POST") {
      code += `, json={}`;
    }
    code += `)\ndata = response.json()\nprint(data)`;
    return code;
  },
};

export default function ApiDokumentasjonPage() {
  const tFooter = useTranslations("footer");
  return (
    <div className="min-h-screen bg-[#0A0B0D]" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header className="border-b border-[#2A2D35] bg-[#15171B]/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <a href="/no" className="font-bold text-xl text-[#F9FAFB] no-underline">Klarpakke</a>
          <nav className="flex gap-4 items-center">
            <a href="/no/api-dokumentasjon" className="text-[#3B82F6] no-underline text-sm font-medium">API</a>
            <a href="/no/login" className="text-[#9CA3AF] no-underline text-sm hover:text-[#F9FAFB] transition-colors">Logg inn</a>
            <a href="/no/register" className="bg-[#3B82F6] text-white text-sm px-4 py-2 rounded-xl no-underline hover:bg-[#2563EB] transition-colors active:scale-[0.98]">Registrer deg</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#1A1D26]/80 border border-[#2A2D35] rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-xs text-[#9CA3AF] font-mono">REST API v1 — Offentlig</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#F9FAFB] mb-4 tracking-tight">
            API-dokumentasjon
          </h1>
          <p className="text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
            Bygg videre på Klarpakke. Våre offentlige API-endepunkter lar deg hente leaderboard-data,
            live-hendelser og mer — ingen autentisering nødvendig for de fleste endepunkter.
          </p>
        </div>
      </section>

      {/* Quick Info */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5">
            <div className="text-[#3B82F6] text-2xl mb-2">🔓</div>
            <h3 className="text-[#F9FAFB] font-semibold text-sm mb-1">Åpen tilgang</h3>
            <p className="text-xs text-[#6B7280]">De fleste endepunktene krever ingen autentisering — perfekt for integrering.</p>
          </div>
          <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5">
            <div className="text-[#F59E0B] text-2xl mb-2">⚡</div>
            <h3 className="text-[#F9FAFB] font-semibold text-sm mb-1">Sanntidsdata</h3>
            <p className="text-xs text-[#6B7280]">Live-feed, leaderboard-endringer og PilotPush — oppdateres løpende.</p>
          </div>
          <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5">
            <div className="text-[#10B981] text-2xl mb-2">📦</div>
            <h3 className="text-[#F9FAFB] font-semibold text-sm mb-1">JSON-respons</h3>
            <p className="text-xs text-[#6B7280]">Alle endepunkter returnerer standard JSON med <code className="text-[#10B981]">success</code>-felt.</p>
          </div>
        </div>
      </section>

      {/* Endepunkter */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-[#F9FAFB] mb-8">Endepunkter</h2>

        <div className="space-y-8">
          {ENDPOINTS.map((ep, idx) => {
            const curlCode = CODE_EXAMPLES.curl(ep.path, ep.method, ep.auth.startsWith("**"));
            const fetchCode = CODE_EXAMPLES.fetch(ep.path, ep.method, ep.auth.startsWith("**"));
            const pythonCode = CODE_EXAMPLES.python(ep.path, ep.method, ep.auth.startsWith("**"));
            const methodColor =
              ep.method === "GET"
                ? "bg-[#065F46] text-[#10B981]"
                : "bg-[#5B21B6] text-[#A78BFA]";

            return (
              <div
                key={idx}
                className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl overflow-hidden"
              >
                {/* Endpoint header */}
                <div className="p-5 sm:p-6 border-b border-[#2A2D35]">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold font-mono ${methodColor}`}>
                      {ep.method}
                    </span>
                    <code className="text-[#F9FAFB] font-mono text-sm sm:text-base font-semibold break-all">
                      {ep.path}
                    </code>
                    {ep.auth.startsWith("**") ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#7F1D1D] text-[#EF4444] text-xs font-medium">
                        🔒 {ep.auth.replace(/\*\*/g, "")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#064E3B] text-[#10B981] text-xs font-medium">
                        🔓 {ep.auth}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed">{ep.description}</p>
                  {ep.params !== "Ingen" && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="text-xs text-[#6B7280] font-medium">Parametere:</span>
                      <code className="text-xs text-[#FBBF24] bg-[#451A03] px-2 py-0.5 rounded font-mono">{ep.params}</code>
                    </div>
                  )}
                  {ep.note && (
                    <p className="mt-2 text-xs text-[#6B7280] italic">💡 {ep.note}</p>
                  )}
                </div>

                {/* Response eksempel */}
                <div className="border-b border-[#2A2D35]">
                  <div className="px-5 sm:px-6 py-3 bg-[#0A0B0D]/50 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                    <span className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">Respons</span>
                  </div>
                  <pre className="p-5 sm:p-6 overflow-x-auto text-sm leading-relaxed" style={{ backgroundColor: "#08090D", margin: 0 }}>
                    <code className="text-[#E5E7EB] font-mono text-xs sm:text-sm whitespace-pre">{ep.response}</code>
                  </pre>
                </div>

                {/* Kode-eksempler */}
                <div>
                  <div className="px-5 sm:px-6 py-3 bg-[#0A0B0D]/50 flex items-center gap-2 border-b border-[#2A2D35]">
                    <svg className="w-4 h-4 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">Kode-eksempler</span>
                  </div>

                  {/* cURL */}
                  <CodeBlock label="curl" code={curlCode} />

                  {/* JavaScript */}
                  <CodeBlock label="JavaScript (fetch)" code={fetchCode} />

                  {/* Python */}
                  <CodeBlock label="Python (requests)" code={pythonCode} last />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Autentisering */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-[#F9FAFB] mb-6">Autentisering</h2>

        <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-2xl shrink-0">🔐</div>
            <div>
              <h3 className="text-[#F9FAFB] font-semibold mb-2">Supabase JWT-session</h3>
              <p className="text-sm text-[#9CA3AF] leading-relaxed mb-4">
                Endepunkter som krever autentisering bruker Supabase-session. Når du er logget inn på
                Klarpakke.no, settes en HTTP-only cookie automatisk. For ekstern tilgang må du sende
                <code className="text-[#FBBF24] bg-[#451A03] px-1.5 py-0.5 rounded text-xs font-mono mx-1">Authorization: Bearer &lt;access_token&gt;</code>
                i headeren.
              </p>
              <p className="text-xs text-[#6B7280]">
                Hent token via Supabase Auth JS SDK:{' '}
                <code className="text-[#10B981] bg-[#064E3B] px-1.5 py-0.5 rounded text-xs font-mono">
                  supabase.auth.getSession()
                </code>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Base URL */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-[#F9FAFB] mb-6">Base URL</h2>

        <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-6">
          <p className="text-sm text-[#9CA3AF] leading-relaxed mb-4">
            Alle API-kall gjøres mot:
          </p>
          <div className="bg-[#08090D] rounded-xl p-4 border border-[#2A2D35]">
            <code className="text-[#FBBF24] font-mono text-sm">
              https://www.klarpakke.no
            </code>
          </div>
          <p className="mt-3 text-xs text-[#6B7280]">
            Merk: For utvikling lokalt, erstatt med <code className="text-[#9CA3AF] bg-[#1A1D26] px-1 rounded text-xs font-mono">http://localhost:3000</code>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2D35] bg-[#15171B] px-6 py-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-[#F9FAFB] font-bold">Klarpakke</span>
            <span className="text-[#6B7280]">|</span>
            <span className="text-sm text-[#6B7280]">{tFooter("brandTagline")}</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-[#6B7280]">
            <a href="/no/vilkar" className="hover:text-[#9CA3AF] transition-colors">Vilkår</a>
            <span>·</span>
            <a href="/no/personvern" className="hover:text-[#9CA3AF] transition-colors">Personvern</a>
            <span>·</span>
            <a href="/no/kontakt" className="hover:text-[#9CA3AF] transition-colors">Kontakt</a>
          </div>
          <p className="mt-4 text-xs text-[#6B7280]">
            © 2026 Klarpakke Project.
          </p>
        </div>
      </footer>
    </div>
  );
}

function CodeBlock({ label, code, last }: { label: string; code: string; last?: boolean }) {
  return (
    <div className={!last ? "border-b border-[#2A2D35]" : ""}>
      <div className="px-5 sm:px-6 py-2 bg-[#0A0B0D]/30 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
        </svg>
        <span className="text-[10px] font-medium text-[#6B7280] uppercase tracking-wider">{label}</span>
      </div>
      <div className="relative group">
        <button
          onClick={(e) => {
            const btn = e.currentTarget;
            navigator.clipboard.writeText(code);
            btn.textContent = "Kopiert!";
            setTimeout(() => { btn.textContent = "Kopier"; }, 2000);
          }}
          className="absolute top-3 right-3 text-[10px] font-medium text-[#6B7280] hover:text-[#F9FAFB] bg-[#1A1D26]/80 px-2.5 py-1 rounded-lg border border-[#2A2D35] hover:border-[#3A3D45] transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          Kopier
        </button>
        <pre className="p-5 sm:p-6 overflow-x-auto text-sm leading-relaxed" style={{ backgroundColor: "#08090D", margin: 0 }}>
          <code className="text-[#E5E7EB] font-mono text-xs sm:text-sm whitespace-pre">{code}</code>
        </pre>
      </div>
    </div>
  );
}
