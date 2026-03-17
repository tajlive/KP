# KLT Tokens – analyse og status

**Formål:** Oversikt over hvor KLT tildeles, lagres og vises; konfigurasjon vs implementert; hull og anbefalinger.

---

## 1. Lagring og tabeller

| Tabell | Bruk | Kanonisk |
|--------|------|----------|
| **user_klt_balances** | Saldo per bruker (balance, total_earned, total_spent). Brukes av appen overalt. | ✅ Ja |
| **klt_transactions** | Logg over alle transaksjoner (user_id, amount, type, category, description, reason, metadata). type = 'reward' \| 'spend' \| 'bonus' \| 'founder'; category = lesson_complete, welcome_bonus, osv. | ✅ Ja |
| **kltbalances** (KLA-130) | Eldre/alternativ tabell med userid (ikke user_id). Trigger handle_new_user_klt() og cron daily-klt-bonus skriver hit. | ⚠️ Mulig duplikat – appen leser/skriver **user_klt_balances**. Verdt å konsolidere eller fjerne. |
| **klt_earning_categories** | Kategorier med beløp, cooldown, max_per_day (lesson_complete 100, daily_login 10, osv.). Brukes av historisk award_klt_reward() i migrasjoner. | Leses; appen bruker KLT_REWARDS i kode. |
| **klt_founder_allocations** | Reserverte 10k KLT til første 100 brukere. claim_founder_tokens(). | Egen flyt |

**Anbefaling:** Én kilde til sannhet for saldo = **user_klt_balances**. Vedlikehold eller migrere bort **kltbalances** og triggere som skriver dit, slik at alt går via user_klt_balances.

---

## 2. Konfigurasjon (KLT_REWARDS i kode)

Definert i `src/lib/gamification/klt.ts`:

| Kategori | Beløp | Implementert |
|----------|-------|--------------|
| WELCOME_BONUS | 500 | ✅ SignupClient (direkte upsert + insert klt_transactions); auth-trigger (fix_all_auth_triggers) gir 10 ved referral – ikke 500 |
| LESSON_COMPLETE | 50 | ✅ markLessonComplete() – én gang per leksjon |
| QUIZ_PASS | 100 | ❌ Ikke koblet til quiz-fullføring |
| QUIZ_PERFECT | 200 | ❌ Ikke koblet |
| COURSE_COMPLETE | 500 | ✅ (etter denne runden) – ved fullført modul |
| FIRST_PAPER_TRADE | 100 | ❌ Ikke koblet til første paper trade |
| PAPER_TRADE_WIN | 25 | ❌ Ikke koblet |
| PAPER_TRADE_WIN_STREAK_5 | 150 | ❌ Ikke koblet |
| INVITE_FRIEND | 200 | ❌ Sjekk referral-flyt |
| FRIEND_PURCHASE | 500 | ❌ |
| DAILY_LOGIN_STREAK_7 | 100 | ❌ |
| DAILY_LOGIN_STREAK_30 | 500 | ❌ |
| PROFILE_COMPLETE | 100 | ❌ |
| Admin/Founder | 10 000 | ✅ grantFounderStatus() i actions/admin/users.ts |

---

## 3. Hvor KLT tildeles (implementert i dag)

| Sted | Beløp | Trigger | Tabell |
|------|-------|--------|--------|
| Signup (SignupClient) | 500 | Etter vellykket signup | user_klt_balances + klt_transactions |
| Auth-trigger (referral) | 10 | handle_new_user_consolidated ved referral | user_klt_balances |
| Leksjon fullført | 50 | markLessonComplete() (idempotent) | user_klt_balances + klt_transactions |
| Modul fullført | 500 | markLessonComplete() når siste leksjon i modul fullføres | user_klt_balances + klt_transactions |
| Admin: Founder | 10 000 | grantFounderStatus() | user_klt_balances + klt_transactions |

**Merk:** SignupClient skriver type "welcome_bonus" i klt_transactions.insert – DB-sjekken er type IN ('reward','spend','bonus','founder'). Hvis constraint er aktiv, bør insert bruke type 'reward' og category 'welcome_bonus'. Verifiser i DB eller oppdater SignupClient til type 'reward' + category 'welcome_bonus'.

---

## 4. Hvor KLT vises

| Sted | Komponent / side | Data |
|------|-------------------|------|
| Dashboard / trading | KLTWallet | user_klt_balances (balance, total_earned), klt_transactions (siste 10) |
| Landing | PricingSection | Tekst: «KLT tokens ved registrering og månedlig» |
| Checkout success | checkout/success/page.tsx | tierData.kltMonthly, tierData.kltSignup |
| Profil/oppgradering | UpgradeBanner | «1 000 KLT tokens/mnd», «2 500 KLT tokens/mnd» |
| Velkommen | VelkommenContent | «KLT-poeng (Early Adopter)» |
| Admin | ClientStudentsPage | Founder-knapp «+10k KLT» |

getKLTBalance(userId) brukes der saldo skal hentes programmatisk (f.eks. server-side).

---

## 5. Hull og risiko

1. **Dobbel welcome bonus:** SignupClient gir 500; auth-trigger (ved referral) gir 10 og kan opprette rad. Uten referral får bruker kun SignupClient 500. Med referral: trigger oppdaterer user_klt_balances (+10). Konsistent hvis trigger kun kjører ved referral.
2. **kltbalances vs user_klt_balances:** To systemer; appen bruker kun user_klt_balances. Triggers i KLA-130 skriver til kltbalances – brukere som kun bruker appen ser ikke det. Konsolider til user_klt_balances eller fjern kltbalances-flyt.
3. **Quiz / paper trade / streak / referral:** KLT_REWARDS er definert men ikke koblet til hendelser. Fase 2: koble quiz_pass, first_paper_trade, daily_streak, invite_friend til awardKLT().
4. **Transaksjon type:** klt_transactions.type skal være 'reward' | 'spend' | 'bonus' | 'founder'. awardKLT() bruker allerede type 'reward' og category = transaction type. SignupClient bruker type "welcome_bonus" – bør endres til type 'reward', category 'welcome_bonus' (eller 'signup') for konsistens.

---

## 6. Anbefalinger

1. **Konsolidere til user_klt_balances:** Fjern eller migrér kltbalances og triggere som skriver dit; bruk kun user_klt_balances + klt_transactions.
2. **SignupClient:** Bruk type 'reward' og category 'welcome_bonus' (eller 'signup') ved insert i klt_transactions.
3. **Modul-fullføring:** Tildele 500 KLT når bruker fullfører siste leksjon i en modul (implementert under denne analysen).
4. **Neste fase:** Koble QUIZ_PASS / QUIZ_PERFECT til quiz-oppslag; FIRST_PAPER_TRADE til første vellykkede paper trade; DAILY_LOGIN_STREAK_* til login-streak; INVITE_FRIEND til referral.
5. **KLTWallet:** Vise category (lesson_complete, welcome_bonus, course_complete) i historikk slik at bruker ser kilde til belønning.

---

*Sist oppdatert: mars 2026.*
