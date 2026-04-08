# KLA-159: Implementering av "Hvorfor Priser Beveger Seg" kursmodul

## Oppsummering

Fullstendig implementasjon av kursmodulen "Hvorfor Priser Beveger Seg" med 5 leksjoner, 25 quiz-spørsmål, progresjonssporing og obligatorisk gating før paper trading.

## Fase 1: Database (Ferdig)

### Tabeller opprettet
- `course_modules` - Toppnivå kursmoduler
- `course_lessons` - Individuelle leksjoner
- `lesson_quiz_questions` - Quiz-spørsmål (bruker eksisterende tabell fra tidligere migrasjon)
- `lesson_quiz_attempts` - Quiz-forsøk
- `user_lesson_progress` - Brukerfremgang

### Seed-data (25 quiz-spørsmål)
- Leksjon 1 (Tilbud og Etterspørsel): 5 spørsmål
- Leksjon 2 (Markedssykluser): 5 spørsmål  
- Leksjon 3 (Nyheter og Regulering): 5 spørsmål
- Leksjon 4 (Volatilitet og Risiko): 5 spørsmål
- Leksjon 5 (Teknisk vs Fundamental): 5 spørsmål

### RLS Policy
- Offentlig lesing for publiserte moduler/leksjoner/spørsmål
- Brukere kan kun administrere egen fremgang/forsøk

## Fase 2: Frontend (Ferdig)

### Nye filer opprettet

1. **`src/app/[locale]/kurs/[moduleSlug]/page.tsx`**
   - Server Component som viser moduloversikt
   - Viser 5 leksjoner med progresjonsindikatorer
   - generateMetadata med lokaliserte titler

2. **`src/app/[locale]/kurs/[moduleSlug]/leksjon/[lessonSlug]/page.tsx`**
   - Server Component for leksjonsside
   - Krever innlogging for quiz (viser prompt hvis ikke logget inn)
   - Inkluderer ProgressBar, LessonContent (ReactMarkdown), LessonQuiz
   - Navigasjonsknapper (forrige/neste)

3. **`src/components/kurs/LessonQuiz.tsx`** (oppdatert)
   - Client Component med full quiz-funksjonalitet
   - 80% pass-terskel for å markere leksjon som fullført
   - Viser riktig/feil svar med forklaringer
   - Resultatskjerm med trophy eller retry
   - Støtter både norsk og engelsk

4. **`src/components/kurs/ProgressBar.tsx`** (eksisterte)
   - Viser progresjon i prosent
   - "X av Y leksjoner fullført"

5. **`src/lib/courses/actions.ts`** (oppdatert)
   - `markLessonComplete()` - markerer leksjon som fullført
   - `submitQuizAnswer()` - sender inn quiz-svar
   - `trackLessonTime()` - sporer tid brukt
   - `hasCompletedRequiredModules()` - sjekker obligatorisk fremgang
   - `getModuleProgress()` - henter modulprogresjon

### Eksisterende filer oppdatert

- **`src/app/[locale]/kurs/page.tsx`** - Viser ModuleCard for 'hvorfor-priser-beveger-seg'
- **`src/app/[locale]/dashboard/page.tsx`** - Viser CourseGate hvis obligatorisk modul ikke er fullført
- **`src/components/dashboard/CourseGate.tsx`** - Eksisterte og fungerer

## Fase 3: Tester (Ferdig)

### E2E-tester
- **`e2e/critical/course-module.spec.ts`** - 5 test-scenarier:
  1. Module overview laster, viser 5 leksjoner
  2. Fullfør leksjon-flow (les innhold → svar quiz → se "Riktig!")
  3. Required module blokkerer paper trading
  4. Progress-teller oppdateres etter fullført leksjon
  5. Mobil (375x667) - quiz-options stablet vertikalt

### Unit-tester
- **`tests/unit/course-actions.test.ts`** - Vitest-tester for:
  - `markLessonComplete` upsert korrekte felter
  - `submitQuizAnswer` returnerer isCorrect=true ved riktig svar
  - `trackLessonTime` legger til tid
  - `hasCompletedRequiredModules` sjekker alle obligatoriske leksjoner
  - `getModuleProgress` beregner prosent riktig

## Fase 4: TypeScript Types (Ferdig)

- Generert nye typer: `npx supabase gen types typescript`
- Fikset typefeil i komponenter for nullable verdier
- Ingen nye TypeScript-feil i kurs-relaterte filer

## Funksjonalitet

### For brukere
1. Naviger til `/kurs` - se oversikt over moduler
2. Klikk på "Hvorfor Priser Beveger Seg" modul
3. Velg en leksjon å starte
4. Les innhold (Markdown-formattert)
5. Svar 5 quiz-spørsmål (trenger 80% for å bestå)
6. Ved bestått: Leksjon markeres automatisk som fullført
7. Fortsett til neste leksjon eller tilbake til modul

### For paper trading
- Hvis bruker ikke har fullført obligatorisk modul:
  - CourseGate vises på dashboard
  - "Paper Trading Låst" banner
  - Link til å starte kurset

## Tekniske detaljer

### Dependencies
- `react-markdown` - For å rendre leksjonsinnhold
- `lucide-react` - Ikoner (CheckCircle2, XCircle, Trophy, etc.)

### RLS Sikkerhet
```sql
-- Course modules: anyone can read published
-- Course lessons: anyone can read published
-- Quiz questions: anyone can read for published lessons
-- User lesson progress: users manage own
-- User quiz attempts: users manage own
```

### Pass-terskel
- Quiz krever 80% (4 av 5 spørsmål riktig) for å markere leksjon som fullført
- Ved ikke-bestått: Bruker kan prøve igjen

## Akseptansekriterier Status

| Kriterie | Status |
|----------|--------|
| Database migrert | ✅ Ferdig |
| 5 leksjoner med innhold | ✅ Ferdig |
| 25 quiz-spørsmål | ✅ Ferdig |
| Module overview side | ✅ Ferdig |
| Lesson side med quiz | ✅ Ferdig |
| Progress tracking | ✅ Ferdig |
| Course gate på dashboard | ✅ Ferdig |
| E2E-tester | ✅ Ferdig |
| Unit-tester | ✅ Ferdig |
| TypeScript 0 feil (kurs-filer) | ✅ Ferdig |
| next-intl oversettelser | ✅ Ferdig |
| Mobile-first design | ✅ Ferdig |

## Neste steg for full deploy

1. Kjør `npm run build` for å verifisere produksjonsbygg
2. Deploy til Vercel
3. Verifiser at alle leksjoner laster korrekt
4. Test quiz-flyt end-to-end
5. Bekreft course gate fungerer på dashboard
