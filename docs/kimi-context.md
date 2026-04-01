# KIMI 2.5 — Klarpakke Startblokk
> Kopier ALT under denne linjen og lim inn øverst i KIMI-chatten
> Sist oppdatert: placeholder

---

## KONTEKST — KLARPAKKE
Stack: Next.js 15, TypeScript strict, Supabase (PostgreSQL), Vercel, Tailwind v4, next-intl
Repo: tajlive/KP
Supabase prosjekt: vuxbjlykgmzskxbclquf
Siste migrasjoner: placeholder

Regler (ALDRI bryt disse):
- Norsk default, /en/ for engelsk
- Mobile-first design
- Ingen hardkodet tekst (bruk next-intl)
- Ingen fake stats eller villedende claims
- TypeScript strict — ingen 'any'
- RLS: alle DB-operasjoner må ha auth.uid() = user_id
- Feilhåndtering: try/catch + toast på norsk

## DATABASE SCHEMA
$(cat docs/database-schema.md)

## OPPGAVE
[BESKRIV OPPGAVEN HER]

## LEVERANSE-FORMAT
Lever alltid:
1. Komplett kode (ingen TODO-kommentarer)
2. Migrasjonsfil hvis DB endres (supabase/migrations/YYYYMMDDHHMMSS_navn.sql)
3. Testplan: hvilke url/handlinger tester dette
