# Arkitektur Og Agenter

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## Adding a New Trading Agent

1. Create `src/lib/ai/agents/<name>-agent.ts` implementing `TradingAgent`
2. Export from `src/lib/ai/agents/index.ts`
3. Add to `DEFAULT_AGENTS` array with appropriate `baselineWeight`
4. Write test in `src/lib/ai/agents/__tests__/`
5. Update ensemble-engine weights if needed

### Agent Interface

```typescript
interface TradingAgent {
  id: string;           // unique, e.g. 'trend'
  name: string;         // display name
  baselineWeight: number; // 0-1, relative weight in ensemble
  run(symbol: string, features: AgentFeatures, state?: AgentState): AgentSignal | Promise<AgentSignal>;
}

interface AgentSignal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number; // 0-100
  reasoning: string;
  meta?: Record<string, unknown>;
}
```


