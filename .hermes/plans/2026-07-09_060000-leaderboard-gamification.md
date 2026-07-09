# Lekepenger Leaderboard — Smart Plan (v2 — Live + Paper + Copy)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Gjør Klarpakkes leaderboard til en sosial, gamifisert demo-opplevelse der ALLE 10 testbrukere vises — med separate tabs for Lekepenger og Live Trading, og ett-klikks kopiering av trader-strategier via SmartTrader v3.

**Architecture:** To-tabs leaderboard (Lekepenger default for alle, Live kun for innloggede). Gamification: badges, nivåer, streaks, top-3 podium. Kopiering integrerer med SmartTrader v3 — henter traderens config og starter auto-trade for brukeren. Konkurrenter viser ROI/win rate/copy — Klarpakke har det PLUSS badges, nivåer, norsk språk, og paper-first trygghet.

**Tech Stack:** Next.js RSC → CompetitionClient (eksisterende), SmartTrader v3 data via Supabase, `get_leaderboard` RPC.

---

## 🔍 Konkurrentanalyse

| Feature | eToro | BingX | Phemex | **Klarpakke (nå)** | **Klarpakke (mål)** |
|---------|:-----:|:-----:|:-----:|:---:|:---:|
| Leaderboard | ✅ | ✅ | ✅ | ✅ (tom) | ✅ |
| ROI/prosent visning | ✅ | ✅ | ✅ | ✅ | ✅ |
| Win rate | ✅ | ✅ | ❌ | ✅ | ✅ |
| Copy-trader knapp | ✅ | ✅ | ✅ | ✅ | ✅ |
| Badges/achievements | ❌ | ❌ | ❌ | ❌ | ✅ |
| Nivåer (progresjon) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Social feed | ✅ | ✅ | ❌ | ❌ | ⏳ |
| Mobil-vennlig | ✅ | ✅ | ✅ | ✅ | ✅ |
| Norsk språk | ❌ | ❌ | ❌ | ✅ | ✅ |

**Hva vi kan gjøre bedre:** Ingen konkurenter har badges OG nivåer OG norsk språk samtidig. Klarpakke kan dominere i Norge med gamification + utdanning.

---

## 📋 Tasks

### Task 1: Aktiver testbrukerne på leaderboard

**Objective:** Alle 12 testbrukere (unntatt viking.no) dukker opp på leaderboard med posisjon, ROI, og win rate.

**Files:**
- Modify: `src/lib/leaderboard/preview.ts`
- Check: Supabase `get_leaderboard` RPC

**Step 1: Sjekk at `get_leaderboard` inkluderer testbrukere**
- Query: `SELECT * FROM get_leaderboard('all_time'::text, 50)`
- Expected: Testbrukerne synlige med rank, return_pct, win_rate, trades

**Step 2: Hvis testbrukere mangler, sjekk `refresh_leaderboard`**

Kjør `SELECT refresh_leaderboard()` og verifiser at `leaderboard_bots`/`leaderboard_history` tabeller har data.

**Step 3: Naviger til `/no/leaderboard` i browser**
- Expected: 11 testbrukere synlige med variert ROI (+603% Anne Mo, -38% Kari Aas etc.)

---

### Task 2: Fiks "Laster..." og vis alltid data

**Objective:** Leaderboard skal ALLTID vise innhold — enten reelle traders eller fallback med testbrukerne.

**Files:**
- Modify: `src/features/leaderboard/CompetitionClient.tsx:171-178`

**Step 1: Vis ALLE traders, inkludert de med få handler**

```tsx
// Linje 173: Endre tom-sjekk til å alltid vise innhold
// FØR:
{leaderboard.length === 0 ? (
  <empty state>
) : (
  <full list>
)}

// EITER:
<TraderList 
  entries={leaderboard} 
  showEmptyState={!hasRealTraders && isInitialLoad}
/>
```

**Step 2: Legg til skeleton loading state**

Erstatt `{tComp('loading')}` med 4-5 animerte skeleton rader.

**Step 3: Verifiser**
- Browser: `/no/leaderboard` viser liste umiddelbart (ikke "Laster..." → tom)
- HTML source: 100+ linjer trader-data, ikke spinner

---

### Task 3: Gamification — Badges (Ny komponent)

**Objective:** Hver trader får badges basert på prestasjon. Synlig rett ved siden av navn/rank.

**Files:**
- Create: `src/features/leaderboard/Badges.tsx`
- Modify: `src/features/leaderboard/CompetitionClient.tsx:192-195`

**Step 1: Badge-logikk**

```typescript
// src/features/leaderboard/Badges.tsx
interface Badge {
  id: string;
  label: string;
  emoji: string;
  color: string; // Tailwind bg/color
}

export function getBadges(entry: LeaderboardEntry): Badge[] {
  const badges: Badge[] = [];
  
  if (entry.return_pct > 100) badges.push({ id: 'moon', label: 'Til månen', emoji: '🚀', color: 'purple' });
  if (entry.return_pct > 0 && entry.trade_count >= 10) badges.push({ id: 'profit', label: 'Profitabel', emoji: '💰', color: 'green' });
  if (entry.win_rate >= 70) badges.push({ id: 'sniper', label: 'Snikskytter', emoji: '🎯', color: 'blue' });
  if (entry.trade_count >= 50) badges.push({ id: 'grinder', label: 'Trader', emoji: '⚡', color: 'yellow' });
  if (entry.return_pct < 0) badges.push({ id: 'diamond', label: 'Diamanthånd', emoji: '💎', color: 'slate' });
  
  return badges;
}
```

**Step 2: Badge-komponent**

```tsx
export function TraderBadges({ badges }: { badges: Badge[] }) {
  return (
    <div className="flex items-center gap-1">
      {badges.map(b => (
        <span key={b.id} 
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-${b.color}-100 text-${b.color}-700`}
          title={b.label}
        >
          {b.emoji} <span className="hidden sm:inline">{b.label}</span>
        </span>
      ))}
    </div>
  );
}
```

**Step 3: Integrer i CompetitionClient**

Ved siden av `entry.user_display_name` (linje 192), legg til:
```tsx
<TraderBadges badges={getBadges(entry)} />
```

**Step 4: Verifiser**
- Browser: Anne Mo viser 🚀💰🎯 (604% ROI, 83% win rate, 108 trades)
- Kari Aas viser 💎 (negativ ROI men fortsatt trading)

---

### Task 4: Nivåprogresjon (Progress bar per trader)

**Objective:** Vis en progress bar under hver trader som viser hvilket tier/level de er på og fremgang mot neste nivå.

**Files:**
- Create: `src/features/leaderboard/ProgressBar.tsx`
- Modify: `src/features/leaderboard/CompetitionClient.tsx`

**Step 1: Level-logikk**

```typescript
// Levels: Bruker paper balance + win rate
// Level 1: 0-10 trades, Level 5: 100+ trades
export function getTraderLevel(entry: LeaderboardEntry): { level: number; label: string; progress: number } {
  const trades = entry.total_trades || 0;
  if (trades >= 100) return { level: 5, label: '📈 Elite', progress: 100 };
  if (trades >= 50) return { level: 4, label: '🔥 Pro', progress: (trades-50)/50*100 };
  if (trades >= 25) return { level: 3, label: '⭐ Aktiv', progress: (trades-25)/25*100 };
  if (trades >= 10) return { level: 2, label: '🌱 Lærling', progress: (trades-10)/15*100 };
  return { level: 1, label: '🥚 Nybegynner', progress: trades/10*100 };
}
```

**Step 2: Progress bar UI**

```tsx
export function TraderProgress({ entry }: { entry: LeaderboardEntry }) {
  const { level, label, progress } = getTraderLevel(entry);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span>{label}</span>
      <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-slate-400">Lvl {level}</span>
    </div>
  );
}
```

**Step 3: Integrer under win rate/return i leaderboard-raden**

---

### Task 5: "Se trader" detaljvisning

**Objective:** Klikk på en trader i leaderboard → vis detaljside med equity curve, handelshistorikk, badges, og "kopier" knapp.

**Files:**
- Create: `src/app/[locale]/(social)/traders/[id]/page.tsx` (hvis ikke allerede finnes)
- Modify: `src/features/leaderboard/CompetitionClient.tsx`

**Step 1: Legg til klikk-handler**

På leaderboard-raden, wrap trader-navnet i en `<Link>`:
```tsx
<Link href={`/${params.locale}/traders/${entry.user_id}`} 
  className="hover:text-blue-600 transition-colors">
  {entry.user_display_name}
</Link>
```

**Step 2: Verifiser**
- Navigate to trader detail page, expect: name, badges, equity chart, recent trades, copy button

---

### Task 6: AI-trader-innsikt (Hvorfor gjør de det bra?)

**Objective:** Ved siden av hver trader i leaderboard vises en kort AI-generert forklaring på HVORFOR de presterer som de gjør. Bygger på SmartTrader v3 signal-data.

**Files:**
- Create: `src/features/leaderboard/TraderInsight.tsx`
- Modify: `src/features/leaderboard/CompetitionClient.tsx`

**Step 1: TraderInsight-komponent**

```tsx
export function TraderInsight({ entry, traderConfig }: Props) {
  const insights = generateInsight(entry, traderConfig);
  
  return (
    <div className="bg-blue-50 rounded-lg p-4 mt-2 border border-blue-100">
      <p className="text-xs font-bold text-blue-800 mb-2">🧠 AI-analyse</p>
      <p className="text-sm text-blue-700">{insights.explanation}</p>
      <div className="flex gap-2 mt-2">
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{insights.tip}</span>
      </div>
    </div>
  );
}

function generateInsight(entry: LeaderboardEntry, config: SmartTraderConfig) {
  if (entry.return_pct > 100) return {
    explanation: `${entry.user_display_name} handler når RSI er under ${config.rsiOversoldThreshold} (oversolgt). Kjøper billig og selger ved +${config.takeProfitPct}%.`,
    tip: `Prøv selv: Sett take-profit på ${config.takeProfitPct}% for best resultat`
  };
  if (entry.return_pct < 0) return {
    explanation: `${entry.user_display_name} selger ofte med tap. Stop-loss på ${config.stopLossPct}% trigges for sent i volatile markeder.`,
    tip: 'Tips: Øk stop-loss til 12% for å unngå for tidlige exits'
  };
  return {
    explanation: `${entry.user_display_name} følger en balansert strategi med ${entry.total_trades} handler.`,
    tip: 'Fortsett å trade — flere handler = bedre data'
  };
}
```

**Step 2: Hent traderConfig fra smart_trader_config på session**

Legg til `smart_trader_config` i leaderboard-queryen så vi kan generere personlig innsikt.

**Step 3: Verifiser**
- Anne Mo viser "Kjøper når RSI < 30, selger ved +15%"
- Kari Aas viser "Stop-loss trigges for sent, øk til 12%"
- Alle tradere har en relevant, data-drevet forklaring



### Task 7: Konkurranse-visualisering (Top 3 spotlight)

**Objective:** Øverst på leaderboard — vis medaljene til topp 3 med større kort, profileffekt, og highlight.

**Files:**
- Create: `src/features/leaderboard/TopThree.tsx`
- Modify: `src/features/leaderboard/CompetitionClient.tsx`

**Step 1: TopThree-komponent**

```tsx
export function TopThree({ entries }: { entries: LeaderboardEntry[] }) {
  const podium = [entries[0], entries[1], entries[2]].filter(Boolean);
  if (podium.length < 3) return null;
  
  // Reorder: #2, #1, #3 (visual podium)
  const ordered = [podium[1], podium[0], podium[2]];
  const medals = ['🥈', '🥇', '🥉'];
  
  return (
    <div className="flex justify-center gap-4 mb-8">
      {ordered.map((entry, i) => (
        <div key={entry.id} className="text-center">
          <div className="text-4xl mb-2">{medals[i]}</div>
          <div className="font-bold">{entry.user_display_name}</div>
          <div className={entry.return_pct > 0 ? 'text-green-600' : 'text-red-600'}>
            {entry.return_pct > 0 ? '+' : ''}{entry.return_pct}%
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Plasser TopThree før leaderboard-tabellen (etter header)**

---

### Task 7: Mobiloptimalisering + animasjoner

**Objective:** Leaderboard fungerer på mobil (målgruppens primærenhet). Legg til subtile animasjoner.

**Files:**
- Modify: `src/features/leaderboard/CompetitionClient.tsx`

**Step 1: Responsivt design**
- Leaderboard-kort: stack vertikalt på mobil. Rank + navn + badge på linje 1, stats på linje 2, copy-knapp på linje 3.
- Minimer horizontal overflow.

**Step 2: Animasjoner**
- Nye entries: `fadeIn` + `slideUp` (CSS eller Framer Motion)
- Rank-endringer: flash-effekt når posisjon endres
- Top 3: glow/pulse-effekt på medaljene

**Step 3: Verifiser**
- Test på 375px viewport width (iPhone)
- Alle elementer synlige, ingen horisontal scroll

---

### Task 8: Én-klikks kopiering → SmartTrader v3

**Objective:** "Kopier"-knappen i leaderboard starter SmartTrader v3 med den kopierte traderens config. Ikke bare `risk_level` — henter faktiske strategi-parametre.

**Files:**
- Modify: `src/features/leaderboard/CompetitionClient.tsx:77-86`
- Create: `src/lib/leaderboard/copy-trader.ts`
- Modify: `src/app/api/smart-trader/copy/route.ts`

**Step 1: API-endepunkt for kopiering**

```typescript
// src/app/api/smart-trader/copy/route.ts
export async function POST(req: Request) {
  const { traderUserId, traderSessionId } = await req.json();
  const supabase = await createClient(); // service role
  
  // Hent traderens SmartTrader v3 config
  const { data: sourceSession } = await supabase
    .from('trading_sessions')
    .select('smart_trader_config, trading_pair')
    .eq('id', traderSessionId)
    .single();
  
  // Opprett ny session for brukeren med kopiert config
  // + start SmartTrader v3 tick umiddelbart
  
  return Response.json({ ok: true, sessionId: newSession.id });
}
```

**Step 2: Oppdater handleCopy**

```typescript
const handleCopy = async (entry: LeaderboardEntry) => {
  const res = await fetch('/api/smart-trader/copy', {
    method: 'POST',
    body: JSON.stringify({ traderUserId: entry.user_id, traderSessionId: entry.session_id }),
  });
  const data = await res.json();
  if (data.ok) {
    toast.success(`Kopierer ${entry.user_display_name}! Starter paper-trading...`);
    router.push(`/${params.locale}/dashboard/auto-trade?session=${data.sessionId}`);
  }
};
```

**Step 3: Verifiser**
- Klikk "Kopier" på Anne Mo → ny auto-trade opprettes med hennes config
- Dashboard viser ny session med kopiert strategi
- SmartTrader v3 begynner å handle



### Task 9: Live Trading-tab (innlogget-only)

**Objective:** Egen tab "Live Trading" som kun vises for påloggede brukere. Viser live traders med ROI i ekte kroner.

**Files:**
- Modify: `src/features/leaderboard/CompetitionClient.tsx`

**Step 1: Legg til mode-filter på datafetchen**

```typescript
const [mode, setMode] = useState<'paper' | 'live'>('paper');
// ...
const [data, rank] = await Promise.all([
  getLeaderboard(timeframe, mode),
  user ? getUserRank(user.id, timeframe, mode) : null
]);
```

**Step 2: Tab-bytter i UI**

```tsx
<div className="flex gap-2 mb-4">
  <button onClick={() => setMode('paper')} 
    className={mode === 'paper' ? 'bg-blue-600 text-white' : 'bg-slate-100'}>
    🎓 Lekepenger
  </button>
  <button onClick={() => setMode('live')} 
    className={mode === 'live' ? 'bg-green-600 text-white' : 'bg-slate-100'}
    disabled={!user}>
    💰 Live Trading {!user && '(Logg inn)'}
  </button>
</div>
```

**Step 3: Verifiser**
- Uten innlogging: kun Lekepenger-tab, Live-tab grået
- Med innlogging: begge tabs fungerer



### Task 10: Oppdater `refresh_leaderboard` RPC

**Objective:** `refresh_leaderboard` bruker SmartTrader v3-data og inkluderer alltid testbrukerne.

**Files:**
- Modify: Supabase RPC `refresh_leaderboard` (kjør via psql)

**Step 1: Oppdater RPC-funksjonen**

```sql
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  -- Tøm gammel data
  DELETE FROM leaderboard_bots;
  
  -- Insert data fra SmartTrader v3 sessions
  INSERT INTO leaderboard_bots (user_id, return_pct, win_rate, total_trades, risk_level)
  SELECT 
    ts.user_id,
    CASE WHEN ts.starting_capital_nok > 0
      THEN ((ts.current_capital_nok - ts.starting_capital_nok) / ts.starting_capital_nok * 100)::numeric(8,2)
      ELSE 0
    END,
    CASE WHEN ts.total_trades > 0
      THEN (ts.winning_trades::numeric / NULLIF(ts.total_trades, 0) * 100)::numeric(5,1)
      ELSE 0
    END,
    COALESCE(ts.total_trades, 0),
    'moderate'  -- SmartTrader default risk
  FROM trading_sessions ts
  WHERE ts.smart_trader_enabled = true
    AND ts.mode = 'paper'
    AND ts.total_trades > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Kjør og verifiser**

```bash
psql $POSTGRES_URL_NON_POOLING -c "SELECT refresh_leaderboard();"
psql $POSTGRES_URL_NON_POOLING -c "SELECT * FROM leaderboard_bots LIMIT 10;"
```

---

## ✅ Verifisering (etter alle tasks)

| Sjekk | Forventet |
|-------|-----------|
| `/no/leaderboard` i browser | 11-12 tradere synlig |
| Anne Mo | 🚀 Til månen, 603% ROI, Lvl 5 Elite |
| Kari Aas | 💎 Diamanthånd, -38% ROI, Lvl 3 Aktiv |
| Top 3 | 🥇🥈🥉 medaljespotlight |
| Mobil visning | Full lesbarhet, ingen overflow |
| Klikk på trader | Naviger til `/traders/[id]` detaljside |
| Kopier-knapp | Åpner auto-trade prompt |

---

## 🔧 Teknisk scope

- **3 nye filer:** `Badges.tsx`, `ProgressBar.tsx`, `TopThree.tsx`
- **2 filer modifisert:** `CompetitionClient.tsx`, `refresh_leaderboard` RPC
- **Ingen nye avhengigheter** — bruker eksisterende lucide-react + tailwind
- **Estimert tid:** ~6 timer (8 tasks × ~30 min + verifisering)
