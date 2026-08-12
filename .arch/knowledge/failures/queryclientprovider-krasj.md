# Failure

System: /dashboard (React Query / Next.js 16)
Dato: 2026-08-09

Symptom: HELE dashboardet krasjet i prod da BestemorPanel ble integrert.

Rotårsak: BestemorPanel (bruker `useQuery`) ble integrert i `DashboardClient` uten
`QueryClientProvider` i treet. `/handel` HADDE provider (`CockpitQueryProvider`),
`/dashboard` hadde IKKE.

Fix: wrap i `QueryProvider` fra `src/shared/providers/query-provider.tsx` +
regresjonstest `DashboardClient.test.tsx`.

Permanent regel: Enhver `useQuery`-komponent MÅ ha `QueryClientProvider` i treet.
Ved integrasjon av query-komponenter: legg til regresjonstest i samme commit.

Arvet av: klarpakke-frontend-pitfalls (skill).
