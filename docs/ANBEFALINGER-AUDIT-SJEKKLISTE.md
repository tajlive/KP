# Anbefalinger fra audit – sjekkliste

Dokumentet samler anbefalingene fra den eksterne vurderingen (svakheter og forbedringsområder) med status og prioritering.

---

## 4. Svakheter og forbedringsområder

### 4.1 Subscription/tier-modell – dobbel definisjon

**Problem:** Tier-navn spredt: `tiers.ts` bruker `student | bachelor | master | phd | professor`; andre steder har også `gratis | basis | komplett | pro`, `free`, `beta`. Mapping mellom Stripe/DB og disse navnene er spredt.

**Anbefaling:** Én kilde til sannhet for tier-slug (kun student/bachelor/master/phd/professor) og én felles modul som mapper fra Stripe / `user_profiles.subscription_tier` til disse; fjern dupliserte enum-navn i middleware og hooks.

| Status    | Handling                                                                                                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟡 Delvis | **Kilde:** `src/lib/pricing/tiers.ts` er kilde (VALID_TIER_SLUGS, normalizeTier, getTierLevel). `tier-gate.ts` og `subscription.ts` bruker den.                                              |
| ✅        | **shared.ts:** `SubscriptionTier` er nå `TierSlug` (én kilde). App-kode og webhook/sync skriver `student` i stedet for `free`; priser/success behandler både `free` og `student` som gratis. |
| ⬜        | **Gjenstår:** Ev. sjekk `phase-progression.ts` (Komplett/Pro) og at DB-kolonner kun tillater student/bachelor/master/phd/professor.                                                          |

---

### 4.2 Server-/client-data og caching

**Problem:** Mye data hentes direkte fra Supabase i client (useEffect + createClient). TanStack Query er til stede men lite brukt.

**Anbefaling:** Bruk React Query for bruker-/tier-data, session-lister og lese-heavy API-kall; felles cache, retry og invalidering ved login/logout og webhook-oppdateringer. Behold Supabase direkte der realtime eller én-off henting er nok.

| Status | Handling                                                                                                                                                                                                       |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | **Implementert:** `useProfileQuery` og `useTierQuery` (src/hooks/), `queryKeys` (src/lib/query-keys.ts). QueryProvider i [locale]/layout; invalidering i AuthContext ved SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED. |
| ✅     | Felles query keys; invalidering ved auth. Ved webhook: frontend kan refetch ved success (eller bruke Supabase realtime for subscription).                                                                      |
| ✅     | Supabase direkte beholdt der det trengs (SubscriptionGate/get-entitlements, realtime).                                                                                                                         |

---

### 4.3 API-form og feilhåndtering

**Problem:** Route handlers er mange, små filer under `app/api/`. Ingen felles wrapper for JSON-svar, statuskoder eller feilformat.

**Anbefaling:** Felles hjelpere for NextResponse.json (suksess/feil) og standard feilkoder; ev. Zod-validering av body i én plass per rute. Letter frontend-feilhåndtering og logging (f.eks. Sentry).

| Status | Handling                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | **Implementert:** `src/lib/api-response.ts` med jsonSuccess, jsonError, unauthorized, notFound, badRequest, conflict, internalError og API_ERROR_CODES. |
| ✅     | Standard feilformat: `{ error: string, code?: string }`.                                                                                                |
| ✅     | Brukt i onboarding/complete, stripe/checkout. Zod brukes allerede i paper-trading/execute m.m.                                                          |

---

### 4.4 Type-gjeld og bygg

**Problem (historisk):** Tidligere `ignoreBuildErrors: true`. **Nå:** `false` — se `next.config.mjs` og AGENTS.md.

**Anbefaling:** Gradvis fjerne: start med kritiske paths (auth, checkout, trading); deretter admin og resten. Bruk supabase-generated og ev. TYPE_DEBT.md som referanse.

| Status | Handling                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------- |
| 🟡     | Redusere type-feil gradvis (auth, checkout, trading). Nye moduler (api-response, query-keys, hooks) er fullt typet. |
| ✅     | `ignoreBuildErrors: false` i `next.config.mjs` (hold `npm run type-check` grønn).                                   |
| ✅     | Dokumentert i forbedringsforslag-2026.md og next.config.                                                            |

---

### 4.5 Testing og kvalitet

**Problem:** E2E feilet i tidligere kjøring pga. manglende Playwright-browsere og at appen ikke kjørte.

**Anbefaling:** CI: alltid `npx playwright install` (eller image med browsers); E2E mot startet app (webServer) eller mot et kjent miljø. Behold kritiske E2E (landing, innlogging, paper-trading CTA) som blokkere.

| Status | Handling                                                                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ✅     | **CI:** test.yml, e2e-tests.yml, e2e-critical.yml kjører `npx playwright install` (chromium / chromium+firefox).                                                                                       |
| ✅     | **webServer:** playwright.config.ts aktiverer webServer kun utenfor CI og uten TEST_AGAINST_PROD. I CI settes BASE_URL (PREVIEW_URL eller https://www.klarpakke.no) – E2E kjører mot tilgjengelig app. |
| ✅     | Smoke og critical bruker BASE_URL; blokkende E2E krever at BASE_URL peker på kjørende app (deploy eller preview).                                                                                      |

---

### 4.6 Observability og operasjoner

**Problem:** Sentry og /api/health finnes; mangler strukturert logging og enkel metrikk.

**Anbefaling:** Strukturerte logger på tvers av API (request-id, user-id, route); ev. enkel metrikk for kritiske handlinger (registrering, checkout, første trade).

| Status | Handling                                                                                                                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | **Implementert:** `src/lib/api-request-context.ts` – getOrCreateRequestId, getRequestContext, logApi (strukturert JSON med requestId, path, method, userId). Brukt i onboarding/complete.            |
| ✅     | **Implementert:** `trackCriticalAction` i src/lib/sentry.ts (signup, checkout, first_trade, onboarding_complete). Kalles fra onboarding/complete, stripe/checkout, gamification/award (first_trade). |

---

## 5. Anbefalte prioriteringer

| Prioritet  | Tema                                                                                                      | Status                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Høy**    | Samle tier-definisjon og mapping (én modul, samme slug overalt; oppdater middleware og SubscriptionGate). | ✅ Se 4.1                                                                    |
| **Høy**    | Utvide bruk av TanStack Query for bruker/tier og viktige lister; invalider ved auth og webhooks.          | ✅ Se 4.2                                                                    |
| **Medium** | Felles API-response/error-format og Zod-validering på viktige POST/PUT-ruter.                             | ✅ Se 4.3                                                                    |
| **Medium** | CI: sikre at E2E kjører med installerte browsers og tilgjengelig app (webServer eller env URL).           | ✅ Se 4.5                                                                    |
| **Lav**    | Redusere type-gjeld; request-id og valgfri metrikk på kritiske ruter.                                     | ✅ 4.6 implementert; `ignoreBuildErrors` av — videre rydding i `as any` e.l. |

---

## 6. Konklusjon (fra audit)

Prosjektet er moderne og logisk oppbygd. De viktigste forbedringene er:

1. **Konsolidert tier-/subscription-modell** (4.1)
2. **Mer bruk av React Query** for server-state (4.2)
3. **Stabil E2E i CI** (4.5)
4. Deretter felles API-form (4.3) og gradvis redusert type-gjeld (4.4).

---

**Oppdatert:** Mars 2026. Oppdater denne sjekklisten når punkter er fullført (🟡 → ✅).
