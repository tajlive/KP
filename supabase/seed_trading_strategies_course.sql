-- ============================================================================
-- Klarpakke: Trading-Strategier Kursmodul
-- Seed: 5 leksjoner med grundig norsk innhold
-- Matches actual DB schema: sort_order, options (jsonb), correct_option_id
-- ============================================================================

-- Module
INSERT INTO course_modules (slug, title_no, title_en, description_no, description_en, sort_order, is_published, difficulty, estimated_minutes)
VALUES (
  'trading-strategier',
  'Trading-Strategier: Slik tjener (og taper) folk penger på krypto',
  'Trading Strategies: How people make (and lose) money in crypto',
  'Grundig gjennomgang av de viktigste strategiene: Smart DCA, Grid Trading, Funding Rate Arbitrage og prisarbitrage. Med matematikk, eksempler og ærlige risikovurderinger.',
  'In-depth coverage of the most important strategies: Smart DCA, Grid Trading, Funding Rate Arbitrage and price arbitrage.',
  5,
  true,
  'intermediate',
  150
)
ON CONFLICT (slug) DO UPDATE SET
  title_no = EXCLUDED.title_no,
  description_no = EXCLUDED.description_no,
  is_published = true;

-- ===========================================
-- Leksjon 1: trading-strategier-oversikt
-- ===========================================
INSERT INTO course_lessons (
  module_id, slug, title_no, title_en, content_no, content_en, sort_order, is_published, estimated_minutes
)
SELECT
  m.id, 'trading-strategier-oversikt', 'Hvordan tjener folk penger på krypto? (Ærlig versjon)', 'How do people make money in crypto? (Honest version)',
  '(Se kursinnhold i databasen)',
  'Content in English coming soon.',
  1, true, 15
FROM course_modules m WHERE m.slug = 'trading-strategier'
ON CONFLICT (module_id, slug) DO UPDATE SET
  title_no = EXCLUDED.title_no,
  is_published = true;

-- ===========================================
-- Leksjon 2: smart-dca
-- ===========================================
INSERT INTO course_lessons (
  module_id, slug, title_no, title_en, content_no, content_en, sort_order, is_published, estimated_minutes
)
SELECT
  m.id, 'smart-dca', 'Smart DCA – Kjøp litt og litt, men smartere', 'Smart DCA – Buy a little at a time, but smarter',
  '(Se kursinnhold i databasen)',
  'Content in English coming soon.',
  2, true, 20
FROM course_modules m WHERE m.slug = 'trading-strategier'
ON CONFLICT (module_id, slug) DO UPDATE SET
  title_no = EXCLUDED.title_no,
  is_published = true;

-- ===========================================
-- Leksjon 3: grid-trading
-- ===========================================
INSERT INTO course_lessons (
  module_id, slug, title_no, title_en, content_no, content_en, sort_order, is_published, estimated_minutes
)
SELECT
  m.id, 'grid-trading', 'Grid Trading – Tjen på sideveis marked', 'Grid Trading – Profit from sideways markets',
  '(Se kursinnhold i databasen)',
  'Content in English coming soon.',
  3, true, 25
FROM course_modules m WHERE m.slug = 'trading-strategier'
ON CONFLICT (module_id, slug) DO UPDATE SET
  title_no = EXCLUDED.title_no,
  is_published = true;

-- ===========================================
-- Leksjon 4: funding-rate-arbitrage
-- ===========================================
INSERT INTO course_lessons (
  module_id, slug, title_no, title_en, content_no, content_en, sort_order, is_published, estimated_minutes
)
SELECT
  m.id, 'funding-rate-arbitrage', 'Funding Rate Arbitrage – Nesten risikofritt?', 'Funding Rate Arbitrage – Almost risk-free?',
  '(Se kursinnhold i databasen)',
  'Content in English coming soon.',
  4, true, 30
FROM course_modules m WHERE m.slug = 'trading-strategier'
ON CONFLICT (module_id, slug) DO UPDATE SET
  title_no = EXCLUDED.title_no,
  is_published = true;

-- ===========================================
-- Leksjon 5: krypto-arbitrage
-- ===========================================
INSERT INTO course_lessons (
  module_id, slug, title_no, title_en, content_no, content_en, sort_order, is_published, estimated_minutes
)
SELECT
  m.id, 'krypto-arbitrage', 'Arbitrage – Kjøp billig, selg dyrt (samme sekund)', 'Arbitrage – Buy low, sell high (same second)',
  '(Se kursinnhold i databasen)',
  'Content in English coming soon.',
  5, true, 20
FROM course_modules m WHERE m.slug = 'trading-strategier'
ON CONFLICT (module_id, slug) DO UPDATE SET
  title_no = EXCLUDED.title_no,
  is_published = true;

-- ===========================================
-- Quiz-spørsmål (jsonb options, correct_option_id)
-- ===========================================
INSERT INTO lesson_quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
SELECT l.id,
  'Hva er den viktigste fordelen med Smart DCA sammenlignet med naiv DCA?', 'What is the main advantage of Smart DCA over naive DCA?',
  '[{"id": "a", "text_no": "Du kjøper alltid til lavest pris", "text_en": "You always buy at the lowest price"}, {"id": "b", "text_no": "Du bruker RSI for å kjøpe mer når prisen er lav", "text_en": "You use RSI to buy more when price is low"}, {"id": "c", "text_no": "Du trenger ikke tenke i det hele tatt", "text_en": "You never need to think"}, {"id": "d", "text_no": "Du garanterer avkastning", "text_en": "You guarantee returns"}]'::jsonb, 'b',
  'Smart DCA bruker RSI som filter.', 'Smart DCA uses RSI as a filter.', 1
FROM course_lessons l
JOIN course_modules m ON l.module_id = m.id
WHERE m.slug = 'trading-strategier' AND l.slug = 'smart-dca'
ON CONFLICT DO NOTHING;

INSERT INTO lesson_quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
SELECT l.id,
  'Hva er den største risikoen med Grid Trading?', 'What is the biggest risk with Grid Trading?',
  '[{"id": "a", "text_no": "For mange trades", "text_en": "Too many trades"}, {"id": "b", "text_no": "Prisen kan falle langt under grid-range", "text_en": "Price can fall far below grid range"}, {"id": "c", "text_no": "Det koster for mye i strøm", "text_en": "High electricity costs"}, {"id": "d", "text_no": "Grid botter er alltid dyre", "text_en": "Grid bots are always expensive"}]'::jsonb, 'b',
  'Prisen kan falle under hele grid-rangen.', 'Price can fall below grid range.', 1
FROM course_lessons l
JOIN course_modules m ON l.module_id = m.id
WHERE m.slug = 'trading-strategier' AND l.slug = 'grid-trading'
ON CONFLICT DO NOTHING;

INSERT INTO lesson_quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
SELECT l.id,
  'I funding rate arbitrage, hva betyr "delta-nøytral"?', 'In funding rate arbitrage, what does "delta-neutral" mean?',
  '[{"id": "a", "text_no": "Du tjener uansett retning", "text_en": "You profit regardless of direction"}, {"id": "b", "text_no": "Prisbevegelser påvirker deg ikke fordi du har like posisjoner i motsatt retning", "text_en": "Price movements dont affect you because you have equal positions in opposite directions"}, {"id": "c", "text_no": "Du aldri taper penger", "text_en": "You never lose money"}, {"id": "d", "text_no": "Delta er et gresk ord for null", "text_en": "Delta is Greek for zero"}]'::jsonb, 'b',
  'Delta-nøytral = like posisjoner i motsatt retning.', 'Delta-neutral = equal opposite positions.', 1
FROM course_lessons l
JOIN course_modules m ON l.module_id = m.id
WHERE m.slug = 'trading-strategier' AND l.slug = 'funding-rate-arbitrage'
ON CONFLICT DO NOTHING;

INSERT INTO lesson_quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
SELECT l.id,
  'Hvorfor er pris-arbitrage vanskelig for vanlige folk?', 'Why is price arbitrage difficult for regular people?',
  '[{"id": "a", "text_no": "Det er ulovlig", "text_en": "It is illegal"}, {"id": "b", "text_no": "Prisforskjellene er små og profesjonelle botter er raskere enn deg", "text_en": "Price differences are small and professional bots are faster"}, {"id": "c", "text_no": "Krypto-børser forbyr det", "text_en": "Exchanges forbid it"}, {"id": "d", "text_no": "Det krever kunstig intelligens", "text_en": "It requires AI"}]'::jsonb, 'b',
  'Profesjonelle botter handler i millisekunder.', 'Professional bots trade in milliseconds.', 1
FROM course_lessons l
JOIN course_modules m ON l.module_id = m.id
WHERE m.slug = 'trading-strategier' AND l.slug = 'krypto-arbitrage'
ON CONFLICT DO NOTHING;

