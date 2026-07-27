# Komponent: PositionCard

> **Fil:** `src/features/jokertrade/PositionCard.tsx` (ny)

---

**Hensikt:** Vis en åpen posisjon med sanntids P&L, agent-stemmer, og "Hvorfor?"-knapp. Ekspanderbar for detaljer.

**Visuelt design:**
- Kort: `border border-kp-border rounded-2xl bg-kp-bg-card p-4`
- Øverste rad: Symbol (fet) + antall + P&L (høyrejustert)
- P&L positiv: `text-kp-success font-bold`, pil ▲
- P&L negativ: `text-kp-danger font-bold`, pil ▼
- Agent-stemmer: kollapset som standard, ekspander med "▼ Hvorfor?"
- Hver agent-rad: navn + confidence + farget bar (grønn for BUY, rød for SELL, gul for HOLD)

**Tilstander:**
- Default: Viser symbol, antall, P&L. Agent-stemmer skjult.
- Expanded: Agent-stemmer synlige under en border-top separator
- Loading (under kjøp/salg): Skeletonglow på P&L-tall
- Error: "Kunne ikke hente pris" i muted tekst

**Responsiv:**
- Mobil (<768px): Full bredde, P&L under symbol (ikke side-om-side)
- Desktop (≥768px): Symbol venstre, P&L høyre på samme rad

**Props:**
```tsx
interface PositionCardProps {
  position: {
    id: string;
    trading_pair: string;       // "SOLUSDT"
    side: "buy" | "sell";
    quantity: number;            // 3.5
    entry_price: number;         // 142.75
    current_price?: number;      // 145.20 (null hvis loading)
    pnl?: number;                // 8.58 (null hvis loading)
    pnl_pct?: number;            // 1.7
    agent_votes?: AgentVote[];   // [{ agent: "trend", action: "buy", confidence: 92 }, ...]
    joker_explanation?: string;  // "Solana Firedancer upgrade..."
  };
}
```

**Tailwind-klasser (compact):**

```html
<div className="border border-kp-border rounded-2xl bg-kp-bg-card p-4 hover:border-kp-border-light transition-colors">
  {/* Header-rad */}
  <div className="flex items-center justify-between">
    <div>
      <span className="font-bold text-kp-text-primary">{position.trading_pair}</span>
      <span className="text-kp-text-muted text-caption ml-2">
        {position.quantity} @ ${position.entry_price}
      </span>
    </div>
    <div className={`font-bold text-right ${pnl >= 0 ? 'text-kp-success' : 'text-kp-danger'}`}>
      {pnl >= 0 ? '▲' : '▼'} ${Math.abs(pnl)} ({pnlPct}%)
    </div>
  </div>

  {/* Ekspanderbar agent-stemmer */}
  {expanded && (
    <div className="mt-3 pt-3 border-t border-kp-border-light">
      <div className="space-y-1.5">
        {agentVotes.map(vote => (
          <div key={vote.agent} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-kp-text-secondary truncate">{vote.agent}</span>
            <span className="w-8 text-right font-bold text-kp-text-primary">{vote.confidence}%</span>
            <span className={`w-8 text-right font-bold ${
              vote.action === 'buy' ? 'text-kp-success' :
              vote.action === 'sell' ? 'text-kp-danger' : 'text-kp-warning'
            }`}>{vote.action.toUpperCase()}</span>
            <div className="flex-1 h-1.5 rounded-full bg-kp-bg-hover overflow-hidden">
              <div className={`h-full rounded-full ${
                vote.action === 'buy' ? 'bg-kp-success' :
                vote.action === 'sell' ? 'bg-kp-danger' : 'bg-kp-warning'
              }`} style={{ width: `${vote.confidence}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-kp-border-light text-caption text-kp-text-muted">
        {position.joker_explanation}
      </div>
    </div>
  )}

  {/* Ekspander-knapp */}
  <button
    onClick={() => setExpanded(!expanded)}
    className="mt-2 text-caption text-kp-brand hover:text-kp-brand-light transition-colors"
  >
    {expanded ? '▲ Vis mindre' : '▼ Hvorfor?'}
  </button>
</div>
```
