;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="79643eff-79ad-66eb-ccbd-e194715bb371")}catch(e){}}();
module.exports=[328878,a=>{"use strict";var b=a.i(187924);let c=[{method:"GET",path:"/api/health",auth:"Ingen",description:"Systemhelsesjekk. Returnerer status for database, Binance-tilkobling, leaderboard, Redis KV, trading-signaler, feilrate, handelsvolum og flere subsystemer. Brukes av Cloudflare-monitorering og intern cron.",params:"Ingen",response:`{
  "status": "healthy",
  "timestamp": "2026-07-10T12:00:00.000Z",
  "version": "abc1234",
  "checks": {
    "database": { "status": "ok", "latency": 45 },
    "tradingSignals": { "status": "ok", "latency": 32 },
    "kv": { "status": "ok", "latency": 12 },
    "environment": { "status": "ok" },
    "binanceConnectivity": {
      "status": "ok",
      "primaryWorked": false,
      "fallbackActive": true,
      "endpointUsed": "binance-proxy"
    },
    "leaderboard": { "status": "ok", "latency": 28, "count": 42 },
    "errorRate": { "status": "ok", "count": 2 },
    "tradesPerMinute": { "status": "ok", "count": 15 }
  },
  "uptime": 847201
}`,note:"Caches i 30 sekunder via Redis (hvis konfigurert)."},{method:"GET",path:"/api/leaderboard",auth:"Ingen",description:"Hent topplista over tradere. Returnerer rangerte tradere med avkastning, win rate, antall handler og risikonivå. Sortert på rank stigende.",params:"`period` (query, valgfri) — `weekly` (default), `monthly` eller `all_time`",response:`{
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
}`,note:"Maks 50 tradere per respons. Data hentes fra Supabase REST API med anon key — ingen autentisering nødvendig."},{method:"GET",path:"/api/live/feed",auth:"Ingen",description:"Siste hendelser fra hele plattformen i sanntid. Inkluderer handler, leaderboard-endringer, nye brukere og AI-signaler. Brukes av LiveFeed-widget på Pilot-siden.",params:"`limit` (query, valgfri) — antall hendelser (default: 20, maks: 50)",response:`{
  "success": true,
  "data": [
    {
      "id": "evt_abc123",
      "type": "trade",
      "title": "🟦 Kj\xf8p BTC/USDT",
      "description": "KryptoKaptein kj\xf8pte 0.01 BTC",
      "user_display_name": "KryptoKaptein",
      "metadata": {
        "trading_pair": "BTC/USDT",
        "side": "buy",
        "quantity": 0.01
      },
      "created_at": "2026-07-10T11:59:00.000Z"
    }
  ]
}`,note:"Data hentes fra `live_events`-tabellen. Polling anbefales hvert 15. sekund."},{method:"GET",path:"/api/leaderboard/changes",auth:"Ingen",description:"Sammenligner nåværende leaderboard med siste tatt snapshot. Returnerer hvem som har klatret eller falt på topplista. Brukes av Social Proof-widget for å vise «hvem passerer hvem».",params:"`period` (query, valgfri) — `weekly` (default), `monthly` eller `all_time`",response:`{
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
}`,note:"Positiv `rank_change` betyr klatring. Negativ = falt. Sortert med størst klatring først."},{method:"GET",path:"/api/pilot/notifications",auth:"Ingen",description:"Returnerer siste Pilot-handler med AI-forklaring. Brukes av PilotPush-widget for å vise «🎭 PilotTrade»-varsler på tvers av plattformen.",params:"`limit` (query, valgfri) — antall varsler (default: 20, maks: 50)",response:`{
  "success": true,
  "data": [
    {
      "id": "trd_xyz",
      "user_display_name": "KryptoKaptein",
      "title": "🎭 KryptoKaptein — 🟦 Kj\xf8p BTC/USDT",
      "description": "🎭 Pilot: BTC viste bullish flagg med RSI over 60",
      "trading_pair": "BTC/USDT",
      "side": "buy",
      "quantity": 0.05,
      "price": 58742.30,
      "executed_at": "2026-07-10T11:45:00.000Z"
    }
  ]
}`,note:"Kun handler med `pilot_trade = true` og en `pilot_explanation` returneres."},{method:"POST",path:"/api/pilot",auth:"**Påkrevd** — Supabase JWT-session",description:"Utløs Pilot-analyse. Hermes AI analyserer markedet og lagrer resultatet i `market_intelligence`. Simulerer AI-generert signal for angitt kryptovaluta.",params:"Ingen body-parametere (krever) — genererer tilfeldig signal",response:`{
  "success": true,
  "message": "🎭 Pilot-analyse fullf\xf8rt!",
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
}`,note:"Krever gyldig Supabase auth-session (settes automatisk ved innlogging). Returnerer 401 hvis uautorisert."}];function d({label:a,code:c,last:e}){return(0,b.jsxs)("div",{className:e?"":"border-b border-[#2A2D35]",children:[(0,b.jsxs)("div",{className:"px-5 sm:px-6 py-2 bg-[#0A0B0D]/30 flex items-center gap-2",children:[(0,b.jsx)("svg",{className:"w-3.5 h-3.5 text-[#6B7280]",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,b.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M8 9l3 3-3 3m5 0h3"})}),(0,b.jsx)("span",{className:"text-[10px] font-medium text-[#6B7280] uppercase tracking-wider",children:a})]}),(0,b.jsxs)("div",{className:"relative group",children:[(0,b.jsx)("button",{onClick:a=>{let b=a.currentTarget;navigator.clipboard.writeText(c),b.textContent="Kopiert!",setTimeout(()=>{b.textContent="Kopier"},2e3)},className:"absolute top-3 right-3 text-[10px] font-medium text-[#6B7280] hover:text-[#F9FAFB] bg-[#1A1D26]/80 px-2.5 py-1 rounded-lg border border-[#2A2D35] hover:border-[#3A3D45] transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer",style:{fontFamily:"system-ui, sans-serif"},children:"Kopier"}),(0,b.jsx)("pre",{className:"p-5 sm:p-6 overflow-x-auto text-sm leading-relaxed",style:{backgroundColor:"#08090D",margin:0},children:(0,b.jsx)("code",{className:"text-[#E5E7EB] font-mono text-xs sm:text-sm whitespace-pre",children:c})})]})]})}a.s(["default",0,function(){return(0,b.jsxs)("div",{className:"min-h-screen bg-[#0A0B0D]",style:{fontFamily:"system-ui, sans-serif"},children:[(0,b.jsx)("header",{className:"border-b border-[#2A2D35] bg-[#15171B]/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-50",children:(0,b.jsxs)("div",{className:"max-w-6xl mx-auto flex justify-between items-center",children:[(0,b.jsx)("a",{href:"/no",className:"font-bold text-xl text-[#F9FAFB] no-underline",children:"Klarpakke"}),(0,b.jsxs)("nav",{className:"flex gap-4 items-center",children:[(0,b.jsx)("a",{href:"/no/api-dokumentasjon",className:"text-[#3B82F6] no-underline text-sm font-medium",children:"API"}),(0,b.jsx)("a",{href:"/no/login",className:"text-[#9CA3AF] no-underline text-sm hover:text-[#F9FAFB] transition-colors",children:"Logg inn"}),(0,b.jsx)("a",{href:"/no/register",className:"bg-[#3B82F6] text-white text-sm px-4 py-2 rounded-xl no-underline hover:bg-[#2563EB] transition-colors active:scale-[0.98]",children:"Registrer deg"})]})]})}),(0,b.jsx)("section",{className:"text-center px-6 pt-20 pb-12",children:(0,b.jsxs)("div",{className:"max-w-4xl mx-auto",children:[(0,b.jsxs)("div",{className:"inline-flex items-center gap-2 bg-[#1A1D26]/80 border border-[#2A2D35] rounded-full px-4 py-1.5 mb-6",children:[(0,b.jsx)("span",{className:"w-2 h-2 rounded-full bg-[#10B981] animate-pulse"}),(0,b.jsx)("span",{className:"text-xs text-[#9CA3AF] font-mono",children:"REST API v1 — Offentlig"})]}),(0,b.jsx)("h1",{className:"text-4xl sm:text-5xl font-extrabold text-[#F9FAFB] mb-4 tracking-tight",children:"API-dokumentasjon"}),(0,b.jsx)("p",{className:"text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed",children:"Bygg videre på Klarpakke. Våre offentlige API-endepunkter lar deg hente leaderboard-data, live-hendelser og mer — ingen autentisering nødvendig for de fleste endepunkter."})]})}),(0,b.jsx)("section",{className:"max-w-6xl mx-auto px-6 pb-12",children:(0,b.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-4",children:[(0,b.jsxs)("div",{className:"rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5",children:[(0,b.jsx)("div",{className:"text-[#3B82F6] text-2xl mb-2",children:"🔓"}),(0,b.jsx)("h3",{className:"text-[#F9FAFB] font-semibold text-sm mb-1",children:"Åpen tilgang"}),(0,b.jsx)("p",{className:"text-xs text-[#6B7280]",children:"De fleste endepunktene krever ingen autentisering — perfekt for integrering."})]}),(0,b.jsxs)("div",{className:"rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5",children:[(0,b.jsx)("div",{className:"text-[#F59E0B] text-2xl mb-2",children:"⚡"}),(0,b.jsx)("h3",{className:"text-[#F9FAFB] font-semibold text-sm mb-1",children:"Sanntidsdata"}),(0,b.jsx)("p",{className:"text-xs text-[#6B7280]",children:"Live-feed, leaderboard-endringer og PilotPush — oppdateres løpende."})]}),(0,b.jsxs)("div",{className:"rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5",children:[(0,b.jsx)("div",{className:"text-[#10B981] text-2xl mb-2",children:"📦"}),(0,b.jsx)("h3",{className:"text-[#F9FAFB] font-semibold text-sm mb-1",children:"JSON-respons"}),(0,b.jsxs)("p",{className:"text-xs text-[#6B7280]",children:["Alle endepunkter returnerer standard JSON med ",(0,b.jsx)("code",{className:"text-[#10B981]",children:"success"}),"-felt."]})]})]})}),(0,b.jsxs)("section",{className:"max-w-6xl mx-auto px-6 pb-20",children:[(0,b.jsx)("h2",{className:"text-2xl font-bold text-[#F9FAFB] mb-8",children:"Endepunkter"}),(0,b.jsx)("div",{className:"space-y-8",children:c.map((a,c)=>{var e,f,g,h,i,j,k,l,m;let n,o,p,q=(e=a.path,f=a.method,g=a.auth.startsWith("**"),n=`curl -X ${f} https://www.klarpakke.no${e}`,g&&(n+=` \\
  -H "Authorization: Bearer <din_supabase_token>"`),n+=` \\
  -H "Content-Type: application/json"`,n),r=(h=a.path,i=a.method,j=a.auth.startsWith("**"),o=`fetch("https://www.klarpakke.no${h}", {
  method: "${i}",
  headers: {
    "Content-Type": "application/json"`,j&&(o+=',\n    "Authorization": `Bearer ${supabaseSession.access_token}`'),o+=`
  }`,"POST"===i&&(o+=`,
  body: JSON.stringify({})`),o+=`
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`),s=(k=a.path,l=a.method,m=a.auth.startsWith("**"),p=`import requests

url = "https://www.klarpakke.no${k}"
headers = {
    "Content-Type": "application/json"`,m&&(p+=`,
    "Authorization": f"Bearer {supabase_token}"`),p+=`
}

response = requests.${l.toLowerCase()}(url, headers=headers`,"POST"===l&&(p+=", json={}"),p+=`)
data = response.json()
print(data)`),t="GET"===a.method?"bg-[#065F46] text-[#10B981]":"bg-[#5B21B6] text-[#A78BFA]";return(0,b.jsxs)("div",{className:"rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl overflow-hidden",children:[(0,b.jsxs)("div",{className:"p-5 sm:p-6 border-b border-[#2A2D35]",children:[(0,b.jsxs)("div",{className:"flex flex-wrap items-center gap-3 mb-3",children:[(0,b.jsx)("span",{className:`inline-block px-2.5 py-1 rounded-md text-xs font-bold font-mono ${t}`,children:a.method}),(0,b.jsx)("code",{className:"text-[#F9FAFB] font-mono text-sm sm:text-base font-semibold break-all",children:a.path}),a.auth.startsWith("**")?(0,b.jsxs)("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#7F1D1D] text-[#EF4444] text-xs font-medium",children:["🔒 ",a.auth.replace(/\*\*/g,"")]}):(0,b.jsxs)("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#064E3B] text-[#10B981] text-xs font-medium",children:["🔓 ",a.auth]})]}),(0,b.jsx)("p",{className:"text-sm text-[#9CA3AF] leading-relaxed",children:a.description}),"Ingen"!==a.params&&(0,b.jsxs)("div",{className:"mt-3 flex flex-wrap gap-1.5",children:[(0,b.jsx)("span",{className:"text-xs text-[#6B7280] font-medium",children:"Parametere:"}),(0,b.jsx)("code",{className:"text-xs text-[#FBBF24] bg-[#451A03] px-2 py-0.5 rounded font-mono",children:a.params})]}),a.note&&(0,b.jsxs)("p",{className:"mt-2 text-xs text-[#6B7280] italic",children:["💡 ",a.note]})]}),(0,b.jsxs)("div",{className:"border-b border-[#2A2D35]",children:[(0,b.jsxs)("div",{className:"px-5 sm:px-6 py-3 bg-[#0A0B0D]/50 flex items-center gap-2",children:[(0,b.jsx)("svg",{className:"w-4 h-4 text-[#10B981]",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,b.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M4 6h16M4 12h16m-7 6h7"})}),(0,b.jsx)("span",{className:"text-xs font-medium text-[#9CA3AF] uppercase tracking-wider",children:"Respons"})]}),(0,b.jsx)("pre",{className:"p-5 sm:p-6 overflow-x-auto text-sm leading-relaxed",style:{backgroundColor:"#08090D",margin:0},children:(0,b.jsx)("code",{className:"text-[#E5E7EB] font-mono text-xs sm:text-sm whitespace-pre",children:a.response})})]}),(0,b.jsxs)("div",{children:[(0,b.jsxs)("div",{className:"px-5 sm:px-6 py-3 bg-[#0A0B0D]/50 flex items-center gap-2 border-b border-[#2A2D35]",children:[(0,b.jsx)("svg",{className:"w-4 h-4 text-[#F59E0B]",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,b.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"})}),(0,b.jsx)("span",{className:"text-xs font-medium text-[#9CA3AF] uppercase tracking-wider",children:"Kode-eksempler"})]}),(0,b.jsx)(d,{label:"curl",code:q}),(0,b.jsx)(d,{label:"JavaScript (fetch)",code:r}),(0,b.jsx)(d,{label:"Python (requests)",code:s,last:!0})]})]},c)})})]}),(0,b.jsxs)("section",{className:"max-w-6xl mx-auto px-6 pb-20",children:[(0,b.jsx)("h2",{className:"text-2xl font-bold text-[#F9FAFB] mb-6",children:"Autentisering"}),(0,b.jsx)("div",{className:"rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-6",children:(0,b.jsxs)("div",{className:"flex items-start gap-4",children:[(0,b.jsx)("div",{className:"text-2xl shrink-0",children:"🔐"}),(0,b.jsxs)("div",{children:[(0,b.jsx)("h3",{className:"text-[#F9FAFB] font-semibold mb-2",children:"Supabase JWT-session"}),(0,b.jsxs)("p",{className:"text-sm text-[#9CA3AF] leading-relaxed mb-4",children:["Endepunkter som krever autentisering bruker Supabase-session. Når du er logget inn på Klarpakke.no, settes en HTTP-only cookie automatisk. For ekstern tilgang må du sende",(0,b.jsx)("code",{className:"text-[#FBBF24] bg-[#451A03] px-1.5 py-0.5 rounded text-xs font-mono mx-1",children:"Authorization: Bearer <access_token>"}),"i headeren."]}),(0,b.jsxs)("p",{className:"text-xs text-[#6B7280]",children:["Hent token via Supabase Auth JS SDK:"," ",(0,b.jsx)("code",{className:"text-[#10B981] bg-[#064E3B] px-1.5 py-0.5 rounded text-xs font-mono",children:"supabase.auth.getSession()"})]})]})]})})]}),(0,b.jsxs)("section",{className:"max-w-6xl mx-auto px-6 pb-20",children:[(0,b.jsx)("h2",{className:"text-2xl font-bold text-[#F9FAFB] mb-6",children:"Base URL"}),(0,b.jsxs)("div",{className:"rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-6",children:[(0,b.jsx)("p",{className:"text-sm text-[#9CA3AF] leading-relaxed mb-4",children:"Alle API-kall gjøres mot:"}),(0,b.jsx)("div",{className:"bg-[#08090D] rounded-xl p-4 border border-[#2A2D35]",children:(0,b.jsx)("code",{className:"text-[#FBBF24] font-mono text-sm",children:"https://www.klarpakke.no"})}),(0,b.jsxs)("p",{className:"mt-3 text-xs text-[#6B7280]",children:["Merk: For utvikling lokalt, erstatt med ",(0,b.jsx)("code",{className:"text-[#9CA3AF] bg-[#1A1D26] px-1 rounded text-xs font-mono",children:"http://localhost:3000"})]})]})]}),(0,b.jsx)("footer",{className:"border-t border-[#2A2D35] bg-[#15171B] px-6 py-8",children:(0,b.jsxs)("div",{className:"max-w-6xl mx-auto text-center",children:[(0,b.jsxs)("div",{className:"flex items-center justify-center gap-2 mb-4",children:[(0,b.jsx)("span",{className:"text-[#F9FAFB] font-bold",children:"Klarpakke"}),(0,b.jsx)("span",{className:"text-[#6B7280]",children:"|"}),(0,b.jsx)("span",{className:"text-sm text-[#6B7280]",children:"Norges enkleste krypto-trading"})]}),(0,b.jsxs)("div",{className:"flex items-center justify-center gap-3 text-xs text-[#6B7280]",children:[(0,b.jsx)("a",{href:"/no/vilkar",className:"hover:text-[#9CA3AF] transition-colors",children:"Vilkår"}),(0,b.jsx)("span",{children:"·"}),(0,b.jsx)("a",{href:"/no/personvern",className:"hover:text-[#9CA3AF] transition-colors",children:"Personvern"}),(0,b.jsx)("span",{children:"·"}),(0,b.jsx)("a",{href:"/no/kontakt",className:"hover:text-[#9CA3AF] transition-colors",children:"Kontakt"})]}),(0,b.jsx)("p",{className:"mt-4 text-xs text-[#6B7280]",children:"© 2026 Klarpakke AS. Org.no: 929003292 MVA."})]})})]})}])}];

//# debugId=79643eff-79ad-66eb-ccbd-e194715bb371
//# sourceMappingURL=src_app_%5Blocale%5D_%28marketing%29_api-dokumentasjon_page_tsx_1bld_n3._.js.map