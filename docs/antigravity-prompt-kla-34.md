# Antigravity Prompt: KLA-34 🏆 Gamification Level Up

## Oppgave
Implementer automatisk XP/Nivå-oppgradering med database-triggere og email-varsling når brukere klatrer på leaderboardet.

## Kontekst
Klarpakke har allerede:
- `user_gamification_stats` tabell (xp, level, badges)
- `xp_transactions` tabell for å logge XP-endringer
- `leaderboard` tabell (daily/weekly/monthly/all_time views)
- `profiles` tabell med brukerinfo
- `gamification/award` API endepunkt
- Resend email-konfigurasjon

## Gjennomføring

### 1. Database Triggere (SQL)

Opprett fil: `supabase/migrations/20260228_gamification_levelup_triggers.sql`

```sql
-- Trigger: Når XP endres, sjekk om bruker skal level opp
CREATE OR REPLACE FUNCTION check_level_up()
RETURNS TRIGGER AS $$
DECLARE
  new_level INTEGER;
  old_level INTEGER;
  level_thresholds INTEGER[] := ARRAY[0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];
BEGIN
  old_level := NEW.level;
  
  -- Finn riktig level basert på total XP
  SELECT COALESCE(MAX(level), 1) INTO new_level
  FROM generate_series(1, 10) AS level
  WHERE level_thresholds[level] <= NEW.total_xp;
  
  -- Hvis level opp
  IF new_level > old_level THEN
    NEW.level := new_level;
    NEW.level_up_at := NOW();
    
    -- Send notification (insert into notifications table)
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'level_up',
      '🎉 Gratulerer med oppgradering!',
      'Du har nådd level ' || new_level || '!',
      jsonb_build_object('old_level', old_level, 'new_level', new_level)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_level_up
  BEFORE UPDATE ON user_gamification_stats
  FOR EACH ROW
  EXECUTE FUNCTION check_level_up();
```

### 2. Leaderboard Klatring Detection

```sql
-- Trigger: Sjekk om bruker har klatret på leaderboard
CREATE OR REPLACE FUNCTION check_leaderboard_climb()
RETURNS TRIGGER AS $$
DECLARE
  old_rank INTEGER;
  new_rank INTEGER;
  leaderboard_type TEXT;
BEGIN
  leaderboard_type := NEW.time_period;
  
  -- Hent gammel rank (hvis finnes)
  SELECT rank INTO old_rank
  FROM leaderboard_history
  WHERE user_id = NEW.user_id
    AND time_period = leaderboard_type
    AND date = CURRENT_DATE - INTERVAL '1 day';
  
  -- Hvis bruker har klatret 5+ plasser
  IF old_rank IS NOT NULL AND old_rank - NEW.rank >= 5 THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'leaderboard_climb',
      '🚀 Du klatrer på leaderboardet!',
      'Du har klatret ' || (old_rank - NEW.rank) || ' plasser på ' || leaderboard_type || ' leaderboard!',
      jsonb_build_object('climb', old_rank - NEW.rank, 'new_rank', NEW.rank)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Edge Function: Send Gamification Emails

Opprett: `supabase/functions/gamification-notifications/index.ts`

- Hent uleste notifications med type 'level_up' eller 'leaderboard_climb'
- Send email via Resend
- Marker som sendt

### 4. API Endepunkt

Oppdater: `src/app/api/gamification/award/route.ts`

- Når XP awardes, sjekk responsen
- Hvis level_up: returner { levelUp: true, newLevel: X }

### 5. Frontend Toast Notification

I `GamificationProvider.tsx` eller relevant komponent:

- Sjekk respons fra award-API
- Vis toast: "🎉 Gratulerer! Du har nådd Level X!"

## Akseptansekriterier

- [ ] Database trigger sjekker level ved XP-oppdatering
- [ ] Level-up lagres i user_gamification_stats
- [ ] Notification opprettes i notifications tabell
- [ ] Email sendes via Resend ved level-up
- [ ] Leaderboard klatring detekteres (5+ plasser)
- [ ] Frontend viser toast ved level-up
- [ ] Alt logges for debugging

## Test Scenario

1. Bruker har 95 XP (Level 1)
2. Award 10 XP → Level 2
3. Sjekk:
   - Database: level=2, level_up_at satt
   - Notification: row opprettet
   - Email: sendt (hvis enabled)
   - Frontend: toast vises

## Ressurser

- Eksisterende tabell: `user_gamification_stats`
- Eksisterende tabell: `xp_transactions`
- Eksisterende tabell: `notifications`
- Resend API key: `process.env.RESEND_API_KEY`
- Email template: Bruk eksisterende stil fra project

## Output

1. SQL migrasjonsfil
2. Edge Function (hvis nødvendig)
3. Oppdatert API route
4. Frontend toast-komponent
5. Dokumentasjon i `docs/GAMIFICATION_LEVELUP.md`

---

**Viktig:** 
- Test grundig med ulike XP-verdier
- Sørg for at triggere ikke kjører i loop
- Legg til rate limiting på email-sending
