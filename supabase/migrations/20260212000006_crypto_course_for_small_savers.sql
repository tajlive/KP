-- ============================================================================
-- KURSU: Krypto for Småsparere
-- Målgruppe: Småsparere med lite/middels IT-kunnskap
-- ============================================================================

-- 1. HOVEDKURS
INSERT INTO courses (slug, title, description, short_description, level, duration_hours, order_index, price_nok, is_published) VALUES
('krypto-for-smaasparere', 'Krypto for Småsparere', 'Lær å kjøpe, selge og beskytte krypto trygt på 4 uker. Ingen teknisk jargon, kun praktisk læring for vanlige folk.', '4-ukers kurs for nybegynnere. Fra null til trygg krypto-eier.', 'beginner', 8, 1, 0, true)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Hent course_id
DO $$
DECLARE
  v_course_id UUID;
BEGIN
  SELECT id INTO v_course_id FROM courses WHERE slug = 'krypto-for-smaasparere';

  -- 2. UKESPLAN - Moduler/Leksjoner
  
  -- UKE 1: TRYGG START
  INSERT INTO lessons (course_id, slug, title, description, content_type, order_index, duration_minutes, is_free_preview) VALUES
  (v_course_id, 'hva-er-krypto', '1.1 Hva er Krypto?', 'Bitcoin = Digitalt gull. Blockchain = Digital regnskapsbok. Hvorfor har det verdi?', 'quiz', 1, 15, true),
  (v_course_id, 'din-forste-lommebok', '1.2 Din Første Lommebok', 'Forskjellen på børs og egen lommebok. Registrering på Firi/Coinbase. 2FA.', 'video', 2, 30, true),
  (v_course_id, 'kjop-forste-bitcoin', '1.3 Kjøp Din Første Bitcoin', 'Du trenger ikke kjøbe 1 hel Bitcoin. Demo: Steg-for-steg kjøp. Hvor mye starte med?', 'simulator', 3, 20, false)
  ON CONFLICT (course_id, slug) DO NOTHING;

  -- UKE 2: BESKYTTELSE
  INSERT INTO lessons (course_id, slug, title, description, content_type, order_index, duration_minutes, is_free_preview) VALUES
  (v_course_id, '5-vanlige-svindler', '2.1 De 5 Vanligste Svindlene', 'Falske eposter, "send penger få tilbake", falsk support, romantikk-svindel, pump & dump.', 'quiz', 4, 25, true),
  (v_course_id, 'passord-og-noekler', '2.2 Passord og Nøkler', 'Seed phrase = Hovednøkkelen. Aldri lagre digitalt. Skriv på papir.', 'video', 5, 20, false),
  (v_course_id, 'skatt-i-norge', '2.3 Skatt i Norge', 'Ja, du må betale skatt. Skatteetaten får info fra børser. Verktøy: Coinpanda.', 'markdown', 6, 15, false)
  ON CONFLICT (course_id, slug) DO NOTHING;

  -- UKE 3: HANDEL
  INSERT INTO lessons (course_id, slug, title, description, content_type, order_index, duration_minutes, is_free_preview) VALUES
  (v_course_id, 'nar-kjope', '3.1 Når Kjøpe?', 'DCA: Fast sum hver måned. Ikke prøv å time markedet. Kjøp når alle er redde.', 'simulator', 7, 20, false),
  (v_course_id, 'god-krypto', '3.2 Hva Er En "God" Krypto?', 'Bitcoin (tryggest), Ethereum (smart), Altcoins (risiko), Meme-coins (gambling).', 'quiz', 8, 25, false),
  (v_course_id, 'stop-loss', '3.3 Stop-Loss og Sikkerhet', 'Automatisk salg hvis pris faller. Hvor sette stop-loss? Demo i appen.', 'video', 9, 20, false)
  ON CONFLICT (course_id, slug) DO NOTHING;

  -- UKE 4: MESTERING
  INSERT INTO lessons (course_id, slug, title, description, content_type, order_index, duration_minutes, is_free_preview) VALUES
  (v_course_id, 'psykologi', '4.1 Psykologi - FOMO og FUD', 'FOMO: Kjøpe fordi alle kjøper. FUD: Selge av panikk. Løsning: Ha en plan.', 'quiz', 10, 20, false),
  (v_course_id, 'investeringsstrategi', '4.2 Din Investeringsstrategi', 'Definer mål, tidsramme, risiko-toleranse. Sett regler for kjøp/salg.', 'markdown', 11, 25, false),
  (v_course_id, 'eksamen', '4.3 Eksamen - Simulert Handel', '100 000 kr virtuelle penger. 30 dager realistiske priser. Tjen mest mulig med lav risiko.', 'simulator', 12, 30, false)
  ON CONFLICT (course_id, slug) DO NOTHING;

END $$;

-- 3. OPPRETT ACHIEVEMENTS/BADGES
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- Standard achievements
INSERT INTO user_achievements (user_id, achievement_id, title, description, icon)
SELECT 
  p.id,
  'first_purchase',
  'Første Kjøp',
  'Kjøpt din første krypto',
  '🆕'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_achievements ua 
  WHERE ua.user_id = p.id AND ua.achievement_id = 'first_purchase'
)
LIMIT 0; -- Bare oppretter tabellen, ikke tildeler ennå

-- RLS for achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (user_id = auth.uid());

-- 4. FUNKSJON FOR Å TILDELE ACHIEVEMENTS
CREATE OR REPLACE FUNCTION award_achievement(
  p_user_id UUID,
  p_achievement_id TEXT,
  p_title TEXT,
  p_description TEXT,
  p_icon TEXT DEFAULT '🏆'
)
RETURNS JSONB AS $$
BEGIN
  INSERT INTO user_achievements (user_id, achievement_id, title, description, icon)
  VALUES (p_user_id, p_achievement_id, p_title, p_description, p_icon)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'achievement', p_achievement_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGER FOR AUTOMATISKE ACHIEVEMENTS
CREATE OR REPLACE FUNCTION check_course_completion_achievements()
RETURNS TRIGGER AS $$
BEGIN
  -- Første leksjon fullført
  IF NEW.is_completed AND NOT OLD.is_completed THEN
    PERFORM award_achievement(
      NEW.user_id,
      'first_lesson',
      'Første Leksjon',
      'Fullført din første leksjon',
      '📚'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_course_achievements ON user_course_progress;
CREATE TRIGGER trigger_course_achievements
  AFTER UPDATE ON user_course_progress
  FOR EACH ROW
  EXECUTE FUNCTION check_course_completion_achievements();

-- Verifiser
SELECT 'Kurs "Krypto for Småsparere" opprettet med 12 leksjoner' as status;
