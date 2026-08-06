# State Management

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 5. Dashboard state amnesi — bot-status glemt ved reload

**Symptom:** JokerTrade/Auto er aktiv (sesjoner i DB), men panel viser "idle" → start-knapp. Bruker kan ikke se at AI handler.

**Rotårsak:** `useState<"idle"|"active">("idle")` — state resettes ved hver page load. Ingen DB-sjekk ved mount.

**Fiks:** `useEffect` med `createClient()` + DB-sjekk på mount. Bruk `checked`-flag for å unngå flimmer. Samme mønster gjelder **alle** statefulle bot-indikatorer (AutoStrategyPanel, JokerDashboard, etc):

```tsx
const [checked, setChecked] = React.useState(false);

React.useEffect(() => {
  let cancelled = false;
  async function checkActive() {
    const sb = createClient(); // fra @/lib/supabase/client
    const { data: { user } } = await sb.auth.getUser();
    if (!user || cancelled) return;
    const { count } = await sb
      .from("trading_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active");
    if (cancelled) return;
    if ((count ?? 0) > 0) {
      setStatus("active");
      setMessage(`${count} aktiv sesjon — AI overvåker og handler`);
    }
  }
  checkActive();
  return () => { cancelled = true; };
}, []);
```

**Prevensjon:** ALLE komponenter som viser aktiv/inaktiv bot-status MÅ ha `useEffect`-DB-sjekk ved mount.

---


## 28. Hardkodet state → API-endepunkt (DailyChallenge mønster)

**Symptom:** En komponent viser tilsynelatende live data, men alt er hardkodet i `useState()`: `const [points, setPoints] = useState(2450)`, `const [rank, setRank] = useState(42)`. Komponenten mottar `userId` som prop men bruker den aldri.

**Mønster for å vekke til live:**

1. **Lag API-endepunkt** som returnerer data for gitt bruker:
   ```
   GET /api/gamification/stats?userId={id}
   → { points: 100, rank: 2, streak: 1, challenges: [...] }
   ```

2. **Foreta komponenten til å fetche** — fjern ALLE hardkodede `useState(defaultValue)`:
   ```tsx
   // FØR:
   const [points] = useState(2450); // hardkodet

   // ETTER:
   const [stats, setStats] = useState<Stats | null>(null);

   useEffect(() => {
     fetch(`/api/gamification/stats?userId=${userId}`)
       .then(r => r.json())
       .then(setStats);
   }, [userId]);

   const points = stats?.points ?? 0;
   ```

3. **Legg til loading-skeleton** mens API-et svarer — `animate-pulse` placeholders (samme antall rader som det ferdige innholdet).

4. **Oppdater testene** — de gamle testene sjekker hardkodede verdier (`expect(screen.getByText("#42"))`). De må mocke `global.fetch` og sjekke mot mock-data.

5. **Fjern ubrukte avhengigheter** — `useAuth` kan droppes hvis `userId` kommer som prop (sjekk hvem som rendrer komponenten).

**Pitfall:** `git add -A` i dette prosjektet inkluderer untracked LinkedIn/Facebook-marketingfiler — bruk alltid eksplisitt `git add <filsti>` eller `.gitignore`. Bruk `git diff --cached --name-only` for å verifisere hva som er staged FØR commit.

---


