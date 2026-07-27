# Komponent: AgentVotes

> **Fil:** `src/features/jokertrade/AgentVotes.tsx` (ny)

---

**Hensikt:** Visualiser resultatet av 12 AI-agenters avstemning. Viser hvilke agenter stemte hva, med fargekodede barer og en totalsum.

**Visuelt design:**
- Container: `border border-kp-border rounded-2xl bg-kp-bg-card p-4`
- Header: "Agent-stemmer" + total-resultat (f.eks. "8/12 BUY")
- Agent-liste: sortert etter confidence synkende
- Hver rad: agent-navn + confidence-tall + action-badge + farget bar
- Bar-bredde = confidence%. maks 100%.
- BUY = grønn, SELL = rød, HOLD = amber
- Totalsum nederst: "8 BUY / 2 SELL / 2 HOLD"

**Tilstander:**
- Default: Viser alle 12 agenter
- Loading: Skjelett-animasjon (6 pulserende rader)
- Empty: "Ingen analyser ennå — kjør CryptoPilot" med JokerButton
- Error: "Kunne ikke hente agent-data"

**Responsiv:**
- Mobil (<768px): Kortere agent-navn (truncate), mindre bar-høyde (1px)
- Desktop (≥768px): Full agent-navn, bar-høyde 1.5px (3px)

**Props:**
```tsx
interface AgentVotesProps {
  votes: AgentVote[];           // 12 elementer
  totalBuy: number;             // 8
  totalSell: number;            // 2
  totalHold: number;            // 2
  symbol: string;               // "SOLUSDT"
  action: "BUY" | "SELL" | "WAIT";
  confidence: number;           // 87
  reasoning?: string;           // "Solana Firedancer upgrade..."
  isLoading?: boolean;
}
```

**Tailwind-klasser:**

```html
<div className="border border-kp-border rounded-2xl bg-kp-bg-card p-4">
  {/* Header */}
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-bold text-white text-sm">🧠 Agent-stemmer</h3>
    <span className={`text-xs font-bold px-2 py-0.5 rounded-badge ${
      action === 'BUY' ? 'bg-kp-success-bg text-kp-success' :
      action === 'SELL' ? 'bg-kp-danger-bg text-kp-danger' : 'bg-kp-warning-bg text-kp-warning'
    }`}>
      {totalBuy}/{totalBuy + totalSell + totalHold} {action}
    </span>
  </div>

  {/* Agent-rader */}
  <div className="space-y-1.5">
    {votes.map(vote => (
      <div key={vote.agent} className="flex items-center gap-2 text-xs">
        <span className="w-20 text-kp-text-secondary truncate">{vote.agent}</span>
        <span className="w-8 text-right font-mono text-kp-text-primary">{vote.confidence}%</span>
        <span className={`w-10 text-center font-bold text-[10px] px-1 py-0.5 rounded ${
          vote.action === 'buy' ? 'bg-kp-success-bg text-kp-success' :
          vote.action === 'sell' ? 'bg-kp-danger-bg text-kp-danger' : 'bg-kp-warning-bg text-kp-warning'
        }`}>
          {vote.action.toUpperCase()}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-kp-bg-hover overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              vote.action === 'buy' ? 'bg-kp-success' :
              vote.action === 'sell' ? 'bg-kp-danger' : 'bg-kp-warning'
            }`}
            style={{ width: `${vote.confidence}%` }}
          />
        </div>
      </div>
    ))}
  </div>

  {/* Totals */}
  <div className="mt-3 pt-2 border-t border-kp-border-light flex gap-4 text-caption text-kp-text-muted">
    <span className="text-kp-success">{totalBuy} BUY</span>
    <span className="text-kp-danger">{totalSell} SELL</span>
    <span className="text-kp-warning">{totalHold} HOLD</span>
  </div>

  {/* Forklaring */}
  {reasoning && (
    <p className="mt-2 text-caption text-kp-text-secondary italic">
      {reasoning}
    </p>
  )}
</div>
```
