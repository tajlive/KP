;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="786e4a5f-68d3-9917-9332-d72f665903a8")}catch(e){}}();
(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,385954,e=>{"use strict";var t=e.i(843476),s=e.i(500932);let a=[{method:"GET",path:"/api/health",auth:"Ingen",description:"Systemhelsesjekk. Returnerer status for database, Binance-tilkobling, leaderboard, Redis KV, trading-signaler, feilrate, handelsvolum og flere subsystemer. Brukes av Cloudflare-monitorering og intern cron.",params:"Ingen",response:`{
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
}`,note:"Krever gyldig Supabase auth-session (settes automatisk ved innlogging). Returnerer 401 hvis uautorisert."}];function r(e,s){var a,r,l,o,i,d,c,m,x;let p,h,u,b=(a=e.path,r=e.method,l=e.auth.startsWith("**"),p=`curl -X ${r} https://www.klarpakke.no${a}`,l&&(p+=` \\
  -H "Authorization: Bearer <din_supabase_token>"`),p+=` \\
  -H "Content-Type: application/json"`,p),g=(o=e.path,i=e.method,d=e.auth.startsWith("**"),h=`fetch("https://www.klarpakke.no${o}", {
  method: "${i}",
  headers: {
    "Content-Type": "application/json"`,d&&(h+=',\n    "Authorization": `Bearer ${supabaseSession.access_token}`'),h+=`
  }`,"POST"===i&&(h+=`,
  body: JSON.stringify({})`),h+=`
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`),f=(c=e.path,m=e.method,x=e.auth.startsWith("**"),u=`import requests

url = "https://www.klarpakke.no${c}"
headers = {
    "Content-Type": "application/json"`,x&&(u+=`,
    "Authorization": f"Bearer {supabase_token}"`),u+=`
}

response = requests.${m.toLowerCase()}(url, headers=headers`,"POST"===m&&(u+=", json={}"),u+=`)
data = response.json()
print(data)`),k="GET"===e.method?"bg-[#065F46] text-[#10B981]":"bg-[#5B21B6] text-[#A78BFA]";return(0,t.jsxs)("div",{className:"rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl overflow-hidden",children:[(0,t.jsxs)("div",{className:"p-5 sm:p-6 border-b border-[#2A2D35]",children:[(0,t.jsxs)("div",{className:"flex flex-wrap items-center gap-3 mb-3",children:[(0,t.jsx)("span",{className:`inline-block px-2.5 py-1 rounded-md text-xs font-bold font-mono ${k}`,children:e.method}),(0,t.jsx)("code",{className:"text-[#F9FAFB] font-mono text-sm sm:text-base font-semibold break-all",children:e.path}),e.auth.startsWith("**")?(0,t.jsxs)("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#7F1D1D] text-[#EF4444] text-xs font-medium",children:["🔒 ",e.auth.replace(/\*\*/g,"")]}):(0,t.jsxs)("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#064E3B] text-[#10B981] text-xs font-medium",children:["🔓 ",e.auth]})]}),(0,t.jsx)("p",{className:"text-sm text-[#9CA3AF] leading-relaxed",children:e.description}),"Ingen"!==e.params&&(0,t.jsxs)("div",{className:"mt-3 flex flex-wrap gap-1.5",children:[(0,t.jsx)("span",{className:"text-xs text-[#6B7280] font-medium",children:"Parametere:"}),(0,t.jsx)("code",{className:"text-xs text-[#FBBF24] bg-[#451A03] px-2 py-0.5 rounded font-mono",children:e.params})]}),e.note&&(0,t.jsxs)("p",{className:"mt-2 text-xs text-[#6B7280] italic",children:["💡 ",e.note]})]}),(0,t.jsxs)("div",{className:"border-b border-[#2A2D35]",children:[(0,t.jsxs)("div",{className:"px-5 sm:px-6 py-3 bg-[#0A0B0D]/50 flex items-center gap-2",children:[(0,t.jsx)("svg",{className:"w-4 h-4 text-[#10B981]",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M4 6h16M4 12h16m-7 6h7"})}),(0,t.jsx)("span",{className:"text-xs font-medium text-[#9CA3AF] uppercase tracking-wider",children:"Respons"})]}),(0,t.jsx)("pre",{className:"p-5 sm:p-6 overflow-x-auto text-sm leading-relaxed",style:{backgroundColor:"#08090D",margin:0},children:(0,t.jsx)("code",{className:"text-[#E5E7EB] font-mono text-xs sm:text-sm whitespace-pre",children:e.response})})]}),(0,t.jsxs)("div",{children:[(0,t.jsxs)("div",{className:"px-5 sm:px-6 py-3 bg-[#0A0B0D]/50 flex items-center gap-2 border-b border-[#2A2D35]",children:[(0,t.jsx)("svg",{className:"w-4 h-4 text-[#F59E0B]",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"})}),(0,t.jsx)("span",{className:"text-xs font-medium text-[#9CA3AF] uppercase tracking-wider",children:"Kode-eksempler"})]}),(0,t.jsx)(n,{label:"curl",code:b}),(0,t.jsx)(n,{label:"JavaScript (fetch)",code:g}),(0,t.jsx)(n,{label:"Python (requests)",code:f,last:!0})]})]},s)}function n(e){let a,r,n,l,o,i,d,c,m,x=(0,s.c)(18),{label:p,code:h,last:u}=e,b=u?"":"border-b border-[#2A2D35]";return x[0]===Symbol.for("react.memo_cache_sentinel")?(a=(0,t.jsx)("svg",{className:"w-3.5 h-3.5 text-[#6B7280]",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M8 9l3 3-3 3m5 0h3"})}),x[0]=a):a=x[0],x[1]!==p?(r=(0,t.jsxs)("div",{className:"px-5 sm:px-6 py-2 bg-[#0A0B0D]/30 flex items-center gap-2",children:[a,(0,t.jsx)("span",{className:"text-[10px] font-medium text-[#6B7280] uppercase tracking-wider",children:p})]}),x[1]=p,x[2]=r):r=x[2],x[3]!==h?(n=e=>{let t=e.currentTarget;navigator.clipboard.writeText(h),t.textContent="Kopiert!",setTimeout(()=>{t.textContent="Kopier"},2e3)},x[3]=h,x[4]=n):n=x[4],x[5]===Symbol.for("react.memo_cache_sentinel")?(l={fontFamily:"system-ui, sans-serif"},x[5]=l):l=x[5],x[6]!==n?(o=(0,t.jsx)("button",{onClick:n,className:"absolute top-3 right-3 text-[10px] font-medium text-[#6B7280] hover:text-[#F9FAFB] bg-[#1A1D26]/80 px-2.5 py-1 rounded-lg border border-[#2A2D35] hover:border-[#3A3D45] transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer",style:l,children:"Kopier"}),x[6]=n,x[7]=o):o=x[7],x[8]===Symbol.for("react.memo_cache_sentinel")?(i={backgroundColor:"#08090D",margin:0},x[8]=i):i=x[8],x[9]!==h?(d=(0,t.jsx)("pre",{className:"p-5 sm:p-6 overflow-x-auto text-sm leading-relaxed",style:i,children:(0,t.jsx)("code",{className:"text-[#E5E7EB] font-mono text-xs sm:text-sm whitespace-pre",children:h})}),x[9]=h,x[10]=d):d=x[10],x[11]!==o||x[12]!==d?(c=(0,t.jsxs)("div",{className:"relative group",children:[o,d]}),x[11]=o,x[12]=d,x[13]=c):c=x[13],x[14]!==b||x[15]!==r||x[16]!==c?(m=(0,t.jsxs)("div",{className:b,children:[r,c]}),x[14]=b,x[15]=r,x[16]=c,x[17]=m):m=x[17],m}e.s(["default",0,function(){let e,n,l,o,i,d,c,m,x,p,h,u,b,g,f,k,j,v,y,N,A,_,B=(0,s.c)(22);return B[0]===Symbol.for("react.memo_cache_sentinel")?(e={fontFamily:"system-ui, sans-serif"},B[0]=e):e=B[0],B[1]===Symbol.for("react.memo_cache_sentinel")?(n=(0,t.jsx)("a",{href:"/no",className:"font-bold text-xl text-[#F9FAFB] no-underline",children:"Klarpakke"}),B[1]=n):n=B[1],B[2]===Symbol.for("react.memo_cache_sentinel")?(l=(0,t.jsx)("header",{className:"border-b border-[#2A2D35] bg-[#15171B]/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-50",children:(0,t.jsxs)("div",{className:"max-w-6xl mx-auto flex justify-between items-center",children:[n,(0,t.jsxs)("nav",{className:"flex gap-4 items-center",children:[(0,t.jsx)("a",{href:"/no/api-dokumentasjon",className:"text-[#3B82F6] no-underline text-sm font-medium",children:"API"}),(0,t.jsx)("a",{href:"/no/login",className:"text-[#9CA3AF] no-underline text-sm hover:text-[#F9FAFB] transition-colors",children:"Logg inn"}),(0,t.jsx)("a",{href:"/no/register",className:"bg-[#3B82F6] text-white text-sm px-4 py-2 rounded-xl no-underline hover:bg-[#2563EB] transition-colors active:scale-[0.98]",children:"Registrer deg"})]})]})}),B[2]=l):l=B[2],B[3]===Symbol.for("react.memo_cache_sentinel")?(o=(0,t.jsx)("section",{className:"text-center px-6 pt-20 pb-12",children:(0,t.jsxs)("div",{className:"max-w-4xl mx-auto",children:[(0,t.jsxs)("div",{className:"inline-flex items-center gap-2 bg-[#1A1D26]/80 border border-[#2A2D35] rounded-full px-4 py-1.5 mb-6",children:[(0,t.jsx)("span",{className:"w-2 h-2 rounded-full bg-[#10B981] animate-pulse"}),(0,t.jsx)("span",{className:"text-xs text-[#9CA3AF] font-mono",children:"REST API v1 — Offentlig"})]}),(0,t.jsx)("h1",{className:"text-4xl sm:text-5xl font-extrabold text-[#F9FAFB] mb-4 tracking-tight",children:"API-dokumentasjon"}),(0,t.jsx)("p",{className:"text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed",children:"Bygg videre på Klarpakke. Våre offentlige API-endepunkter lar deg hente leaderboard-data, live-hendelser og mer — ingen autentisering nødvendig for de fleste endepunkter."})]})}),B[3]=o):o=B[3],B[4]===Symbol.for("react.memo_cache_sentinel")?(i=(0,t.jsxs)("div",{className:"rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5",children:[(0,t.jsx)("div",{className:"text-[#3B82F6] text-2xl mb-2",children:"🔓"}),(0,t.jsx)("h3",{className:"text-[#F9FAFB] font-semibold text-sm mb-1",children:"Åpen tilgang"}),(0,t.jsx)("p",{className:"text-xs text-[#6B7280]",children:"De fleste endepunktene krever ingen autentisering — perfekt for integrering."})]}),B[4]=i):i=B[4],B[5]===Symbol.for("react.memo_cache_sentinel")?(d=(0,t.jsxs)("div",{className:"rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5",children:[(0,t.jsx)("div",{className:"text-[#F59E0B] text-2xl mb-2",children:"⚡"}),(0,t.jsx)("h3",{className:"text-[#F9FAFB] font-semibold text-sm mb-1",children:"Sanntidsdata"}),(0,t.jsx)("p",{className:"text-xs text-[#6B7280]",children:"Live-feed, leaderboard-endringer og PilotPush — oppdateres løpende."})]}),B[5]=d):d=B[5],B[6]===Symbol.for("react.memo_cache_sentinel")?(c=(0,t.jsx)("div",{className:"text-[#10B981] text-2xl mb-2",children:"📦"}),m=(0,t.jsx)("h3",{className:"text-[#F9FAFB] font-semibold text-sm mb-1",children:"JSON-respons"}),B[6]=c,B[7]=m):(c=B[6],m=B[7]),B[8]===Symbol.for("react.memo_cache_sentinel")?(x=(0,t.jsx)("section",{className:"max-w-6xl mx-auto px-6 pb-12",children:(0,t.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-4",children:[i,d,(0,t.jsxs)("div",{className:"rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-5",children:[c,m,(0,t.jsxs)("p",{className:"text-xs text-[#6B7280]",children:["Alle endepunkter returnerer standard JSON med ",(0,t.jsx)("code",{className:"text-[#10B981]",children:"success"}),"-felt."]})]})]})}),B[8]=x):x=B[8],B[9]===Symbol.for("react.memo_cache_sentinel")?(p=(0,t.jsx)("h2",{className:"text-2xl font-bold text-[#F9FAFB] mb-8",children:"Endepunkter"}),B[9]=p):p=B[9],B[10]===Symbol.for("react.memo_cache_sentinel")?(h=(0,t.jsxs)("section",{className:"max-w-6xl mx-auto px-6 pb-20",children:[p,(0,t.jsx)("div",{className:"space-y-8",children:a.map(r)})]}),B[10]=h):h=B[10],B[11]===Symbol.for("react.memo_cache_sentinel")?(u=(0,t.jsx)("h2",{className:"text-2xl font-bold text-[#F9FAFB] mb-6",children:"Autentisering"}),B[11]=u):u=B[11],B[12]===Symbol.for("react.memo_cache_sentinel")?(b=(0,t.jsx)("div",{className:"text-2xl shrink-0",children:"🔐"}),g=(0,t.jsx)("h3",{className:"text-[#F9FAFB] font-semibold mb-2",children:"Supabase JWT-session"}),B[12]=b,B[13]=g):(b=B[12],g=B[13]),B[14]===Symbol.for("react.memo_cache_sentinel")?(f=(0,t.jsxs)("p",{className:"text-sm text-[#9CA3AF] leading-relaxed mb-4",children:["Endepunkter som krever autentisering bruker Supabase-session. Når du er logget inn på Klarpakke.no, settes en HTTP-only cookie automatisk. For ekstern tilgang må du sende",(0,t.jsx)("code",{className:"text-[#FBBF24] bg-[#451A03] px-1.5 py-0.5 rounded text-xs font-mono mx-1",children:"Authorization: Bearer <access_token>"}),"i headeren."]}),B[14]=f):f=B[14],B[15]===Symbol.for("react.memo_cache_sentinel")?(k=(0,t.jsxs)("section",{className:"max-w-6xl mx-auto px-6 pb-20",children:[u,(0,t.jsx)("div",{className:"rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-6",children:(0,t.jsxs)("div",{className:"flex items-start gap-4",children:[b,(0,t.jsxs)("div",{children:[g,f,(0,t.jsxs)("p",{className:"text-xs text-[#6B7280]",children:["Hent token via Supabase Auth JS SDK:"," ",(0,t.jsx)("code",{className:"text-[#10B981] bg-[#064E3B] px-1.5 py-0.5 rounded text-xs font-mono",children:"supabase.auth.getSession()"})]})]})]})})]}),B[15]=k):k=B[15],B[16]===Symbol.for("react.memo_cache_sentinel")?(j=(0,t.jsx)("h2",{className:"text-2xl font-bold text-[#F9FAFB] mb-6",children:"Base URL"}),B[16]=j):j=B[16],B[17]===Symbol.for("react.memo_cache_sentinel")?(v=(0,t.jsx)("p",{className:"text-sm text-[#9CA3AF] leading-relaxed mb-4",children:"Alle API-kall gjøres mot:"}),B[17]=v):v=B[17],B[18]===Symbol.for("react.memo_cache_sentinel")?(y=(0,t.jsx)("div",{className:"bg-[#08090D] rounded-xl p-4 border border-[#2A2D35]",children:(0,t.jsx)("code",{className:"text-[#FBBF24] font-mono text-sm",children:"https://www.klarpakke.no"})}),B[18]=y):y=B[18],B[19]===Symbol.for("react.memo_cache_sentinel")?(N=(0,t.jsxs)("section",{className:"max-w-6xl mx-auto px-6 pb-20",children:[j,(0,t.jsxs)("div",{className:"rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-6",children:[v,y,(0,t.jsxs)("p",{className:"mt-3 text-xs text-[#6B7280]",children:["Merk: For utvikling lokalt, erstatt med ",(0,t.jsx)("code",{className:"text-[#9CA3AF] bg-[#1A1D26] px-1 rounded text-xs font-mono",children:"http://localhost:3000"})]})]})]}),B[19]=N):N=B[19],B[20]===Symbol.for("react.memo_cache_sentinel")?(A=(0,t.jsxs)("div",{className:"flex items-center justify-center gap-2 mb-4",children:[(0,t.jsx)("span",{className:"text-[#F9FAFB] font-bold",children:"Klarpakke"}),(0,t.jsx)("span",{className:"text-[#6B7280]",children:"|"}),(0,t.jsx)("span",{className:"text-sm text-[#6B7280]",children:"Norges enkleste krypto-trading"})]}),B[20]=A):A=B[20],B[21]===Symbol.for("react.memo_cache_sentinel")?(_=(0,t.jsxs)("div",{className:"min-h-screen bg-[#0A0B0D]",style:e,children:[l,o,x,h,k,N,(0,t.jsx)("footer",{className:"border-t border-[#2A2D35] bg-[#15171B] px-6 py-8",children:(0,t.jsxs)("div",{className:"max-w-6xl mx-auto text-center",children:[A,(0,t.jsxs)("div",{className:"flex items-center justify-center gap-3 text-xs text-[#6B7280]",children:[(0,t.jsx)("a",{href:"/no/vilkar",className:"hover:text-[#9CA3AF] transition-colors",children:"Vilkår"}),(0,t.jsx)("span",{children:"·"}),(0,t.jsx)("a",{href:"/no/personvern",className:"hover:text-[#9CA3AF] transition-colors",children:"Personvern"}),(0,t.jsx)("span",{children:"·"}),(0,t.jsx)("a",{href:"/no/kontakt",className:"hover:text-[#9CA3AF] transition-colors",children:"Kontakt"})]}),(0,t.jsx)("p",{className:"mt-4 text-xs text-[#6B7280]",children:"© 2026 Klarpakke AS. Org.no: 929003292 MVA."})]})})]}),B[21]=_):_=B[21],_}])}]);

//# debugId=786e4a5f-68d3-9917-9332-d72f665903a8