-- Seed data for "Hvorfor Priser Beveger Seg" course module
-- Run after migration: 20260313131733_add_course_tables.sql

-- ============================================
-- INSERT MODULE
-- ============================================
INSERT INTO course_modules (
    slug, title_no, title_en, description_no, description_en, 
    icon, difficulty, estimated_minutes, is_required, sort_order, is_published
) VALUES (
    'hvorfor-priser-beveger-seg',
    'Hvorfor Priser Beveger Seg',
    'Why Prices Move',
    'Forstå de fundamentale kreftene bak kryptovaluta-prisbevegelser. En obligatorisk modul før du starter med paper trading.',
    'Understand the fundamental forces behind cryptocurrency price movements. A required module before you start paper trading.',
    'TrendingUp',
    'beginner',
    55,
    true,
    1,
    true
)
ON CONFLICT (slug) DO UPDATE SET
    title_no = EXCLUDED.title_no,
    title_en = EXCLUDED.title_en,
    description_no = EXCLUDED.description_no,
    description_en = EXCLUDED.description_en,
    is_required = true,
    is_published = true;

-- Get module ID
DO $$
DECLARE
    v_module_id UUID;
BEGIN
    SELECT id INTO v_module_id FROM course_modules WHERE slug = 'hvorfor-priser-beveger-seg';

    -- ============================================
    -- LESSON 1: Tilbud og Etterspørsel
    -- ============================================
    INSERT INTO course_lessons (
        module_id, slug, title_no, title_en, content_no, content_en,
        estimated_minutes, sort_order, is_published
    ) VALUES (
        v_module_id,
        'tilbud-og-ettersporsel',
        'Tilbud og Etterspørsel',
        'Supply and Demand',
        E'# Tilbud og Etterspørsel\n\n## Hva bestemmer prisen på Bitcoin?\n\nPrisen på en kryptovaluta bestemmes av det mest fundamentale økonomiske prinsippet: **tilbud og etterspørsel**. Når flere vil kjøpe enn selge, går prisen opp. Når flere vil selge enn kjøpe, går prisen ned.\n\n## Bitcoins unike egenskap\n\nBitcoin har en hard cap på **21 millioner coins**. Dette betyr at:\n- Det finnes et endelig antall Bitcoin\n- Ingen sentralbank kan trykke mer\n- Tilbudet er forutsigbart og transparent\n\n## Halving-events\n\nHvert fjerde år blir belønningen for mining halvert. Dette reduserer tilførselen av nye Bitcoin til markedet:\n- **2012**: 50 → 25 BTC per blokk\n- **2016**: 25 → 12.5 BTC per blokk\n- **2020**: 12.5 → 6.25 BTC per blokk\n- **2024**: 6.25 → 3.125 BTC per blokk\n\n## Case Study: ETF-godkjenningen i 2024\n\nDa SEC godkjente Bitcoin ETFer i januar 2024, åpnet det døren for institusjonelle investorer. Resultatet:\n- Massiv økning i etterspørsel\n- Begrenset tilbud\n- Prisen økte betydelig i månedene etter\n\n## Hva betyr dette for deg?\n\nForstå at kryptovaluta med begrenset tilbud (som Bitcoin) potensielt kan øke i verdi når etterspørselen øker. Men husk: fortidig avkastning garanterer ikke fremtidig avkastning.',
        E'# Supply and Demand\n\n## What Determines Bitcoin Price?\n\nThe price of a cryptocurrency is determined by the most fundamental economic principle: **supply and demand**. When more people want to buy than sell, the price goes up. When more want to sell than buy, the price goes down.\n\n## Bitcoin Unique Property\n\nBitcoin has a hard cap of **21 million coins**. This means:\n- There is a finite number of Bitcoin\n- No central bank can print more\n- Supply is predictable and transparent\n\n## Halving Events\n\nEvery four years, the mining reward is cut in half. This reduces the supply of new Bitcoin entering the market:\n- **2012**: 50 → 25 BTC per block\n- **2016**: 25 → 12.5 BTC per block\n- **2020**: 12.5 → 6.25 BTC per block\n- **2024**: 6.25 → 3.125 BTC per block\n\n## Case Study: 2024 ETF Approval\n\nWhen the SEC approved Bitcoin ETFs in January 2024, it opened the door for institutional investors. The result:\n- Massive increase in demand\n- Limited supply\n- Significant price increase in the following months\n\n## What This Means for You\n\nUnderstand that cryptocurrencies with limited supply (like Bitcoin) may potentially increase in value as demand rises. But remember: past performance does not guarantee future results.',
        10,
        1,
        true
    )
    ON CONFLICT (module_id, slug) DO UPDATE SET
        title_no = EXCLUDED.title_no,
        title_en = EXCLUDED.title_en,
        content_no = EXCLUDED.content_no,
        content_en = EXCLUDED.content_en,
        is_published = true;

    -- ============================================
    -- LESSON 2: Markedssykluser
    -- ============================================
    INSERT INTO course_lessons (
        module_id, slug, title_no, title_en, content_no, content_en,
        estimated_minutes, sort_order, is_published
    ) VALUES (
        v_module_id,
        'markedssykluser',
        'Markedssykluser',
        'Market Cycles',
        E'# Markedssykluser\n\n## Den 4-årige Bitcoin-syklusen\n\nKryptomarkedet, spesielt Bitcoin, følger omtrentlig en 4-årig syklus som er knyttet til halving-events. Forståelse av disse syklusene kan hjelpe deg med å ta bedre beslutninger.\n\n## Faser i en typisk syklus:\n\n### 1. Akkumuleringsfasen (Bear Market Bottom)\n- Prisene har falt kraftig\n- Frykt og pessimisme dominerer\n- Smarte investorer kjøper gradvis\n- Volumet er lavt\n\n### 2. Tidlig oppgang (Early Bull)\n- Prisen begynner å stige sakte\n- Tidlige adoptører gjenoppretter troen\n- Media dekning øker gradvis\n\n### 3. Euphori-fasen (Peak Bull)\n- "Alle" snakker om krypto\n- Prisene når nye høyder\n- FOMO (Fear Of Missing Out) tar over\n- Dette er ofte tiden for å være forsiktig\n\n### 4. Korrigering (Bear Market)\n- Prisene faller kraftig\n- Panikk selging\n- Mange gir opp og selger med tap\n- Tilbake til fase 1\n\n## Bull vs Bear Market Psykologi\n\n| Bull Market | Bear Market |\n|-------------|-------------|\n| Gjør, optimisme | Frykt, pessimisme |\n| Kjøper på toppen | Selger på bunnen |\n| Ignorerer risiko | Ser kun risiko |\n\n## Hva betyr dette for deg?\n\n- **Ikke kjøp når alle er ekstatiske** (salgssignal)\n- **Ikke selg når alle er redde** (kjøpssignal)\n- Ha en langsiktig strategi\n- Bruk Klarpakkens bot for å fjerne følelser fra beslutninger',
        E'# Market Cycles\n\n## The 4-Year Bitcoin Cycle\n\nThe crypto market, especially Bitcoin, roughly follows a 4-year cycle tied to halving events. Understanding these cycles can help you make better decisions.\n\n## Phases in a Typical Cycle:\n\n### 1. Accumulation Phase (Bear Market Bottom)\n- Prices have fallen significantly\n- Fear and pessimism dominate\n- Smart investors buy gradually\n- Volume is low\n\n### 2. Early Uptrend (Early Bull)\n- Price begins to rise slowly\n- Early adopters regain confidence\n- Media coverage increases gradually\n\n### 3. Euphoria Phase (Peak Bull)\n- "Everyone" is talking about crypto\n- Prices reach new highs\n- FOMO (Fear Of Missing Out) takes over\n- This is often the time to be cautious\n\n### 4. Correction (Bear Market)\n- Prices fall significantly\n- Panic selling\n- Many give up and sell at a loss\n- Back to phase 1\n\n## Bull vs Bear Market Psychology\n\n| Bull Market | Bear Market |\n|-------------|-------------|\n| Greed, optimism | Fear, pessimism |\n| Buying at the top | Selling at the bottom |\n| Ignoring risk | Seeing only risk |\n\n## What This Means for You\n\n- **Do not buy when everyone is euphoric** (sell signal)\n- **Do not sell when everyone is fearful** (buy signal)\n- Have a long-term strategy\n- Use Klarpakke bot to remove emotions from decisions',
        12,
        2,
        true
    )
    ON CONFLICT (module_id, slug) DO UPDATE SET
        title_no = EXCLUDED.title_no,
        title_en = EXCLUDED.title_en,
        content_no = EXCLUDED.content_no,
        content_en = EXCLUDED.content_en,
        is_published = true;

    -- ============================================
    -- LESSON 3: Nyheter og Regulering
    -- ============================================
    INSERT INTO course_lessons (
        module_id, slug, title_no, title_en, content_no, content_en,
        estimated_minutes, sort_order, is_published
    ) VALUES (
        v_module_id,
        'nyheter-regulering',
        'Nyheter og Regulering',
        'News and Regulation',
        E'# Nyheter og Regulering\n\n## Hvordan påvirker nyheter krypto-priser?\n\nKryptomarkedet er spesielt sensitivt for nyheter fordi det er ungt, volatilt og fortsatt under utvikling. En enkelt nyhet kan sende priser opp eller ned 10-20% på timer.\n\n## Viktige nyhetskategorier:\n\n### 1. Regulering og lovgivning\n- SEC beslutninger (USA)\n- Kina-forbud (historisk påvirket markedet)\n- EU MiCA regulering\n- **Norsk skatteetaten retningslinjer**\n\n### 2. Makroøkonomiske hendelser\n- Rentebeslutninger (FED, ECB)\n- Inflasjonsdata\n- Økonomisk vekst/ resesjon\n- Kriger og geopolitiske kriser\n\n### 3. Teknologiske gjennombrudd\n- Oppgraderinger (Ethereum 2.0, etc.)\n- Sikkerhetsbrudd (hacks)\n- Nye protokoller\n\n## Norske skatteregler du må kjenne:\n\n- Krypto er skattepliktig formue i Norge\n- Hver handel er en realisasjon (skattemessig)\n- Skattesats: 22% på gevinst (2024)\n- Fører kryptovaluta på lik linje med andre formuesobjekter\n- Bruk Skatteetatens veiledning for korrekt rapportering\n\n## Hvordan reagere på nyheter?\n\n1. **Ikke panikk-selg** på negative nyheter\n2. **Ikke FOMO-kjøp** på hypede nyheter\n3. **Vurder kildens troverdighet**\n4. **Tenk langsiktig** – dagens nyhet er glemt om en uke\n5. **La boten din håndtere volatilitet** – det er den bygget for',
        E'# News and Regulation\n\n## How Do News Affect Crypto Prices?\n\nThe crypto market is especially sensitive to news because it is young, volatile, and still evolving. A single news story can send prices up or down 10-20% within hours.\n\n## Important News Categories:\n\n### 1. Regulation and Legislation\n- SEC decisions (USA)\n- China bans (historically affected the market)\n- EU MiCA regulation\n- **Norwegian tax authority guidelines**\n\n### 2. Macroeconomic Events\n- Interest rate decisions (FED, ECB)\n- Inflation data\n- Economic growth/recession\n- Wars and geopolitical crises\n\n### 3. Technological Breakthroughs\n- Upgrades (Ethereum 2.0, etc.)\n- Security breaches (hacks)\n- New protocols\n\n## Norwegian Tax Rules You Must Know:\n\n- Crypto is taxable wealth in Norway\n- Every trade is a realization (for tax purposes)\n- Tax rate: 22% on gains (2024)\n- Treated like other wealth objects\n- Use the Tax Administration guidance for correct reporting\n\n## How to React to News?\n\n1. **Do not panic sell** on negative news\n2. **Do not FOMO buy** on hyped news\n3. **Evaluate the source credibility**\n4. **Think long-term** – today''s news is forgotten in a week\n5. **Let your bot handle volatility** – that is what it is built for',
        12,
        3,
        true
    )
    ON CONFLICT (module_id, slug) DO UPDATE SET
        title_no = EXCLUDED.title_no,
        title_en = EXCLUDED.title_en,
        content_no = EXCLUDED.content_no,
        content_en = EXCLUDED.content_en,
        is_published = true;

    -- ============================================
    -- LESSON 4: Volatilitet og Risiko
    -- ============================================
    INSERT INTO course_lessons (
        module_id, slug, title_no, title_en, content_no, content_en,
        estimated_minutes, sort_order, is_published
    ) VALUES (
        v_module_id,
        'volatilitet-risiko',
        'Volatilitet og Risiko',
        'Volatility and Risk',
        E'# Volatilitet og Risiko\n\n## Hvorfor er krypto så volatilt?\n\nVolatilitet betyr prissvingninger. Kryptovaluta er blant de mest volatile investeringene du kan gjøre. Her er hvorfor:\n\n### 1. Ungt marked\n- Krypto er bare ~15 år gammelt\n- Sammenlignet med aksjer (400+ år) er det spedbarnet\n- Markedet finner fortsatt sin "rette" pris\n\n### 2. Lavere likviditet\n- Mindre penger i krypto enn i aksjer/obligasjoner\n- Store kjøp/salg påvirker prisen mer\n\n### 3. 24/7 marked\n- Ingen børs-stopp (circuit breakers)\n- Handel skjer døgnet rundt\n- Nyheter fra andre tidssoner påvirker umiddelbart\n\n### 4. Følelsesdrevet\n- Mange uerfarne investorer\n- FOMO og panikk sprer seg raskt\n- Sosiale medier forsterker bevegelser\n\n## Risikostyring – Det viktigste du vil lære:\n\n### 1. Aldri invester mer enn du kan tape\n- Krypto kan gå til null\n- Bruk kun "disponibel inntekt"\n\n### 2. Diversifiser\n- Ikke alt i én coin\n- Ikke alt i krypto\n- Spred risiko på ulike aktivaklasser\n\n### 3. Stop-loss strategier\n- Bestem på forhånd når du skal selge\n- Teknisk: Stop-loss ordre\n- Mental: "Hvis den faller 30%, selger jeg"\n\n### 4. Bruk Klarpakke sin paper trading\n- Lær uten å risikere ekte penger\n- Test strategier først\n- Bygg selvtillit gradvis\n\n## Husk: Høy volatilitet = både risiko OG mulighet\n- Uten volatilitet, ingen avkastning\n- Men uten risikostyring, ingen overlevelse',
        E'# Volatility and Risk\n\n## Why Is Crypto So Volatile?\n\nVolatility means price fluctuations. Cryptocurrency is among the most volatile investments you can make. Here is why:\n\n### 1. Young Market\n- Crypto is only ~15 years old\n- Compared to stocks (400+ years), it is an infant\n- The market is still finding its "true" price\n\n### 2. Lower Liquidity\n- Less money in crypto than stocks/bonds\n- Large buys/sells affect price more\n\n### 3. 24/7 Market\n- No circuit breakers\n- Trading happens around the clock\n- News from other time zones affects immediately\n\n### 4. Emotion-Driven\n- Many inexperienced investors\n- FOMO and panic spread quickly\n- Social media amplifies movements\n\n## Risk Management – The Most Important Thing You Will Learn:\n\n### 1. Never Invest More Than You Can Afford to Lose\n- Crypto can go to zero\n- Use only "disposable income"\n\n### 2. Diversify\n- Not all in one coin\n- Not all in crypto\n- Spread risk across asset classes\n\n### 3. Stop-Loss Strategies\n- Decide in advance when to sell\n- Technical: Stop-loss orders\n- Mental: "If it drops 30%, I sell"\n\n### 4. Use Klarpakke Paper Trading\n- Learn without risking real money\n- Test strategies first\n- Build confidence gradually\n\n## Remember: High Volatility = Both Risk AND Opportunity\n- Without volatility, no returns\n- But without risk management, no survival',
        11,
        4,
        true
    )
    ON CONFLICT (module_id, slug) DO UPDATE SET
        title_no = EXCLUDED.title_no,
        title_en = EXCLUDED.title_en,
        content_no = EXCLUDED.content_no,
        content_en = EXCLUDED.content_en,
        is_published = true;

    -- ============================================
    -- LESSON 5: Teknisk vs Fundamental Analyse
    -- ============================================
    INSERT INTO course_lessons (
        module_id, slug, title_no, title_en, content_no, content_en,
        estimated_minutes, sort_order, is_published
    ) VALUES (
        v_module_id,
        'teknisk-vs-fundamental',
        'Teknisk vs Fundamental Analyse',
        'Technical vs Fundamental Analysis',
        E'# Teknisk vs Fundamental Analyse\n\n## To måter å analysere markedet på\n\nSom krypto-investor har du to hovedverktøy for å ta beslutninger. Forstå forskjellen – det er nøkkelen til suksess.\n\n## Fundamental Analyse (FA)\n\n**Spørsmål: HVORFOR beveger prisen seg?**\n\nFundamental analyse ser på de underliggende faktorene som gir en kryptovaluta verdi:\n\n### Viktige faktorer:\n- **Tilbud**: Hvor mange coins finnes? (21M for Bitcoin)\n- **Bruk**: Hva kan man bruke den til?\n- **Team**: Hvem står bak prosjektet?\n- **Teknologi**: Er blokkjeden sikker og skalerbar?\n- **Adopsjon**: Hvor mange bruker den?\n- **Konkurranse**: Finnes det bedre alternativer?\n\n### Eksempel på FA:\n> "Bitcoin har begrenset tilbud, økende institusjonell interesse, og halving reduserer ny tilførsel. Dette tyder på positivt prispress langsiktig."\n\n## Teknisk Analyse (TA)\n\n**Spørsmål: NÅR skal jeg kjøpe/selge?**\n\nTeknisk analyse ser på prishistorikk og mønstre for å forutsi fremtidige bevegelser:\n\n### Viktige verktøy:\n- **Støtte- og motstandsnivåer**\n- **Gjennomsnittlige glidende linjer (MA)**\n- **RSI (Relative Strength Index)**\n- **Candlestick-mønstre**\n- **Volum-analyse**\n\n### Eksempel på TA:\n> "Bitcoin har brutt over 200-dagers glidende gjennomsnitt med høyt volum. RSI er på 65 (ikke overkjøpt). Dette er et kjøpssignal."\n\n## Klarpakke sin tilnærming\n\nKlarpakke kombinerer begge metoder:\n\n1. **Fundamental analyse** – Vi velger coins med solid grunnlag\n2. **Tekniske indikatorer** – Boten identifiserer gode inngangspunkter\n3. **Algoritmisk utførelse** – Fjern følelser, følg reglene\n4. **Risikostyring** – Automatisk posisjonsstørrelse og stop-loss\n\n## Oppsummering\n\n| Fundamental | Teknisk |\n|-------------|---------|\n| HVORFOR | NÅR |\n| Langsiktig | Kortsiktig |\n| Verdi | Timing |\n| Tenk investor | Tenk trader |\n\n**Du trenger begge deler for å lykkes!**',
        E'# Technical vs Fundamental Analysis\n\n## Two Ways to Analyze the Market\n\nAs a crypto investor, you have two main tools for making decisions. Understanding the difference is the key to success.\n\n## Fundamental Analysis (FA)\n\n**Question: WHY is the price moving?**\n\nFundamental analysis looks at the underlying factors that give a cryptocurrency value:\n\n### Key Factors:\n- **Supply**: How many coins exist? (21M for Bitcoin)\n- **Utility**: What can it be used for?\n- **Team**: Who is behind the project?\n- **Technology**: Is the blockchain secure and scalable?\n- **Adoption**: How many people use it?\n- **Competition**: Are there better alternatives?\n\n### FA Example:\n> "Bitcoin has limited supply, increasing institutional interest, and halving reduces new supply. This suggests positive price pressure long-term."\n\n## Technical Analysis (TA)\n\n**Question: WHEN should I buy/sell?**\n\nTechnical analysis looks at price history and patterns to predict future movements:\n\n### Key Tools:\n- **Support and resistance levels**\n- **Moving Averages (MA)**\n- **RSI (Relative Strength Index)**\n- **Candlestick patterns**\n- **Volume analysis**\n\n### TA Example:\n> "Bitcoin has broken above the 200-day moving average with high volume. RSI is at 65 (not overbought). This is a buy signal."\n\n## Klarpakke Approach\n\nKlarpakke combines both methods:\n\n1. **Fundamental analysis** – We select coins with solid foundation\n2. **Technical indicators** – Bot identifies good entry points\n3. **Algorithmic execution** – Remove emotions, follow the rules\n4. **Risk management** – Automatic position sizing and stop-loss\n\n## Summary\n\n| Fundamental | Technical |\n|-------------|-----------|\n| WHY | WHEN |\n| Long-term | Short-term |\n| Value | Timing |\n| Think investor | Think trader |\n\n**You need both to succeed!**',
        10,
        5,
        true
    )
    ON CONFLICT (module_id, slug) DO UPDATE SET
        title_no = EXCLUDED.title_no,
        title_en = EXCLUDED.title_en,
        content_no = EXCLUDED.content_no,
        content_en = EXCLUDED.content_en,
        is_published = true;

    -- ============================================
    -- QUIZ QUESTIONS FOR LESSON 1
    -- ============================================
    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva er den hardeste begrensningen på antall Bitcoin som noensinne vil eksistere?',
        'What is the hard cap on the number of Bitcoin that will ever exist?',
        '[{"id": "a", "text_no": "10 millioner", "text_en": "10 million"}, {"id": "b", "text_no": "21 millioner", "text_en": "21 million"}, {"id": "c", "text_no": "100 millioner", "text_en": "100 million"}, {"id": "d", "text_no": "Ingen begrensning", "text_en": "No limit"}]'::jsonb,
        'b',
        'Riktig! Bitcoin har en hard cap på 21 millioner coins. Dette er programmert i protokollen og kan ikke endres.',
        'Correct! Bitcoin has a hard cap of 21 million coins. This is programmed into the protocol and cannot be changed.',
        1
    FROM course_lessons cl
    WHERE cl.slug = 'tilbud-og-ettersporsel' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva skjer under et Bitcoin "halving" event?',
        'What happens during a Bitcoin "halving" event?',
        '[{"id": "a", "text_no": "Prisen halveres automatisk", "text_en": "The price automatically halves"}, {"id": "b", "text_no": "Antall miners halveres", "text_en": "The number of miners halves"}, {"id": "c", "text_no": "Belønningen for mining halveres", "text_en": "The mining reward halves"}, {"id": "d", "text_no": "Transaksjonsgebyrer fjernes", "text_en": "Transaction fees are removed"}]'::jsonb,
        'c',
        'Riktig! Ved halving halveres belønningen miners får for å validere blokker. Dette reduserer tilførselen av nye Bitcoin.',
        'Correct! During halving, the reward miners receive for validating blocks is cut in half. This reduces the supply of new Bitcoin.',
        2
    FROM course_lessons cl
    WHERE cl.slug = 'tilbud-og-ettersporsel' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva er hovedårsaken til at Bitcoin-prisen økte etter ETF-godkjenningen i 2024?',
        'What was the main reason Bitcoin price increased after the 2024 ETF approval?',
        '[{"id": "a", "text_no": "Regjeringen kjøpte Bitcoin", "text_en": "The government bought Bitcoin"}, {"id": "b", "text_no": "Etterspørselen økte dramatisk", "text_en": "Demand increased dramatically"}, {"id": "c", "text_no": "Mining ble enklere", "text_en": "Mining became easier"}, {"id": "d", "text_no": "Bitcoin ble tilgjengelig i butikker", "text_en": "Bitcoin became available in stores"}]'::jsonb,
        'b',
        'Riktig! ETF-godkjenningen åpnet for institusjonelle investorer, noe som førte til massiv økning i etterspørsel mens tilbudet forble begrenset.',
        'Correct! The ETF approval opened the door for institutional investors, leading to massive demand increase while supply remained limited.',
        3
    FROM course_lessons cl
    WHERE cl.slug = 'tilbud-og-ettersporsel' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva skjer med prisen når etterspørselen er høyere enn tilbudet?',
        'What happens to price when demand exceeds supply?',
        '[{"id": "a", "text_no": "Prisen faller", "text_en": "Price falls"}, {"id": "b", "text_no": "Prisen stiger", "text_en": "Price rises"}, {"id": "c", "text_no": "Ingenting skjer", "text_en": "Nothing happens"}, {"id": "d", "text_no": "Transaksjoner blokkeres", "text_en": "Transactions are blocked"}]'::jsonb,
        'b',
        'Riktig! Når flere vil kjøpe enn selge (høy etterspørsel, lavt tilbud), presser det prisen opp.',
        'Correct! When more people want to buy than sell (high demand, low supply), it pushes the price up.',
        4
    FROM course_lessons cl
    WHERE cl.slug = 'tilbud-og-ettersporsel' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hvor ofte skjer Bitcoin halving?',
        'How often does Bitcoin halving occur?',
        '[{"id": "a", "text_no": "Hvert år", "text_en": "Every year"}, {"id": "b", "text_no": "Hvert andre år", "text_en": "Every two years"}, {"id": "c", "text_no": "Hvert fjerde år", "text_en": "Every four years"}, {"id": "d", "text_no": "Hvert tiende år", "text_en": "Every ten years"}]'::jsonb,
        'c',
        'Riktig! Bitcoin halving skjer omtrent hvert fjerde år (hver 210 000 blokk).',
        'Correct! Bitcoin halving occurs approximately every four years (every 210,000 blocks).',
        5
    FROM course_lessons cl
    WHERE cl.slug = 'tilbud-og-ettersporsel' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    -- ============================================
    -- QUIZ QUESTIONS FOR LESSON 2
    -- ============================================
    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hvilken fase i markedssyklusen er karakterisert av "FOMO" og at alle snakker om krypto?',
        'Which market cycle phase is characterized by "FOMO" and everyone talking about crypto?',
        '[{"id": "a", "text_no": "Akkumuleringsfasen", "text_en": "Accumulation phase"}, {"id": "b", "text_no": "Tidlig oppgang", "text_en": "Early uptrend"}, {"id": "c", "text_no": "Euphori-fasen", "text_en": "Euphoria phase"}, {"id": "d", "text_no": "Bear market", "text_en": "Bear market"}]'::jsonb,
        'c',
        'Riktig! Euphori-fasen (Peak Bull) er når FOMO tar over, alle snakker om krypto, og prisene når nye høyder. Dette er ofte tiden for å være forsiktig.',
        'Correct! The Euphoria phase (Peak Bull) is when FOMO takes over, everyone is talking about crypto, and prices reach new highs. This is often the time to be cautious.',
        1
    FROM course_lessons cl
    WHERE cl.slug = 'markedssykluser' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva er vanligvis det beste tidspunktet å kjøpe ifølge leksjonen?',
        'When is usually the best time to buy according to the lesson?',
        '[{"id": "a", "text_no": "Når alle er ekstatiske og FOMO-er", "text_en": "When everyone is euphoric and FOMO-ing"}, {"id": "b", "text_no": "Når alle er redde og panikk-selger", "text_en": "When everyone is fearful and panic selling"}, {"id": "c", "text_no": "Midt i euphori-fasen", "text_en": "In the middle of the euphoria phase"}, {"id": "d", "text_no": "Bare på sommeren", "text_en": "Only in summer"}]'::jsonb,
        'b',
        'Riktig! Leksjonen lærer at du ikke bør selge når alle er redde – dette er faktisk et kjøpssignal. Frykt og pessimisme i bear market er når smarte investorer akkumulerer.',
        'Correct! The lesson teaches that you should not sell when everyone is fearful – this is actually a buy signal. Fear and pessimism in bear markets is when smart investors accumulate.',
        2
    FROM course_lessons cl
    WHERE cl.slug = 'markedssykluser' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva kjennetegner akkumuleringsfasen?',
        'What characterizes the accumulation phase?',
        '[{"id": "a", "text_no": "Høye priser og FOMO", "text_en": "High prices and FOMO"}, {"id": "b", "text_no": "Frykt, pessimisme og lave priser", "text_en": "Fear, pessimism and low prices"}, {"id": "c", "text_no": "Ingen handler i det hele tatt", "text_en": "No one is trading at all"}, {"id": "d", "text_no": "Kun institusjonelle investorer er aktive", "text_en": "Only institutional investors are active"}]'::jsonb,
        'b',
        'Riktig! Akkumuleringsfasen (Bear Market Bottom) er preget av frykt, pessimisme og lave priser. Smarte investorer kjøper gradvis i denne fasen.',
        'Correct! The accumulation phase (Bear Market Bottom) is characterized by fear, pessimism and low prices. Smart investors buy gradually during this phase.',
        3
    FROM course_lessons cl
    WHERE cl.slug = 'markedssykluser' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva er hovedformålet med å forstå markedssykluser?',
        'What is the main purpose of understanding market cycles?',
        '[{"id": "a", "text_no": "Å kunne forutsi eksakte priser", "text_en": "To predict exact prices"}, {"id": "b", "text_no": "Å ta bedre beslutninger og unngå følelsesdrevet trading", "text_en": "To make better decisions and avoid emotional trading"}, {"id": "c", "text_no": "Å vite når man skal selge alt umiddelbart", "text_en": "To know when to sell everything immediately"}, {"id": "d", "text_no": "Å imponere venner", "text_en": "To impress friends"}]'::jsonb,
        'b',
        'Riktig! Å forstå markedssykluser hjelper deg å ta bedre beslutninger og unngå vanlige feller som å kjøpe på toppen (FOMO) eller selge på bunnen (panikk).',
        'Correct! Understanding market cycles helps you make better decisions and avoid common traps like buying at the top (FOMO) or selling at the bottom (panic).',
        4
    FROM course_lessons cl
    WHERE cl.slug = 'markedssykluser' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva betyr "FOMO" i krypto-sammenheng?',
        'What does "FOMO" mean in crypto context?',
        '[{"id": "a", "text_no": "Fear Of Making Offers", "text_en": "Fear Of Making Offers"}, {"id": "b", "text_no": "Fear Of Missing Out", "text_en": "Fear Of Missing Out"}, {"id": "c", "text_no": "Fast Online Money Only", "text_en": "Fast Online Money Only"}, {"id": "d", "text_no": "Frequently Optimistic Market Outlook", "text_en": "Frequently Optimistic Market Outlook"}]'::jsonb,
        'b',
        'Riktig! FOMO = Fear Of Missing Out (frykt for å gå glipp av noe). Dette er en sterk følelse som får folk til å kjøpe på toppen av markedet.',
        'Correct! FOMO = Fear Of Missing Out. This is a strong emotion that causes people to buy at the top of the market.',
        5
    FROM course_lessons cl
    WHERE cl.slug = 'markedssykluser' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    -- ============================================
    -- QUIZ QUESTIONS FOR LESSON 3
    -- ============================================
    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva er skattesatsen på kryptogevinst i Norge (2024)?',
        'What is the tax rate on crypto gains in Norway (2024)?',
        '[{"id": "a", "text_no": "0% (skattefritt)", "text_en": "0% (tax free)"}, {"id": "b", "text_no": "15%", "text_en": "15%"}, {"id": "c", "text_no": "22%", "text_en": "22%"}, {"id": "d", "text_no": "35%", "text_en": "35%"}]'::jsonb,
        'c',
        'Riktig! Skattesatsen på kryptogevinst i Norge er 22% i 2024. Hver handel er en skattemessig realisasjon.',
        'Correct! The tax rate on crypto gains in Norway is 22% in 2024. Every trade is a tax realization.',
        1
    FROM course_lessons cl
    WHERE cl.slug = 'nyheter-regulering' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hvordan bør du reagere på negative nyheter ifølge leksjonen?',
        'How should you react to negative news according to the lesson?',
        '[{"id": "a", "text_no": "Panikk-selg umiddelbart", "text_en": "Panic sell immediately"}, {"id": "b", "text_no": "Kjøp mer for å senke gjennomsnittet", "text_en": "Buy more to lower the average"}, {"id": "c", "text_no": "Ikke panikk-selg, vurder kilden og tenk langsiktig", "text_en": "Do not panic sell, evaluate the source and think long-term"}, {"id": "d", "text_no": "Slette alle krypto-apper", "text_en": "Delete all crypto apps"}]'::jsonb,
        'c',
        'Riktig! Leksjonen anbefaler å ikke panikk-selge på negative nyheter. Vurder kildens troverdighet og tenk langsiktig – dagens nyhet er ofte glemt om en uke.',
        'Correct! The lesson recommends not panic selling on negative news. Evaluate the source credibility and think long-term – today''s news is often forgotten in a week.',
        2
    FROM course_lessons cl
    WHERE cl.slug = 'nyheter-regulering' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hvilken av følgende er IKKE en viktig nyhetskategori som påvirker krypto?',
        'Which of the following is NOT an important news category affecting crypto?',
        '[{"id": "a", "text_no": "Regulering og lovgivning", "text_en": "Regulation and legislation"}, {"id": "b", "text_no": "Makroøkonomiske hendelser", "text_en": "Macroeconomic events"}, {"id": "c", "text_no": "Teknologiske gjennombrudd", "text_en": "Technological breakthroughs"}, {"id": "d", "text_no": "Værmeldinger", "text_en": "Weather forecasts"}]'::jsonb,
        'd',
        'Riktig! Værmeldinger påvirker vanligvis ikke kryptomarkedet (med mindre det er ekstreme hendelser som påvirker datasentre). De tre andre er viktige nyhetskategorier.',
        'Correct! Weather forecasts usually do not affect the crypto market (unless extreme events affecting data centers). The other three are important news categories.',
        3
    FROM course_lessons cl
    WHERE cl.slug = 'nyheter-regulering' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hvilken organisasjon godkjente Bitcoin ETFer i 2024?',
        'Which organization approved Bitcoin ETFs in 2024?',
        '[{"id": "a", "text_no": "ECB (European Central Bank)", "text_en": "ECB (European Central Bank)"}, {"id": "b", "text_no": "Norges Bank", "text_en": "Norges Bank"}, {"id": "c", "text_no": "SEC (Securities and Exchange Commission)", "text_en": "SEC (Securities and Exchange Commission)"}, {"id": "d", "text_no": "FED (Federal Reserve)", "text_en": "FED (Federal Reserve)"}]'::jsonb,
        'c',
        'Riktig! SEC (Securities and Exchange Commission) godkjente Bitcoin ETFer i januar 2024, noe som førte til økt institusjonell interesse.',
        'Correct! The SEC (Securities and Exchange Commission) approved Bitcoin ETFs in January 2024, leading to increased institutional interest.',
        4
    FROM course_lessons cl
    WHERE cl.slug = 'nyheter-regulering' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva betyr det at krypto er en "skattemessig realisasjon" i Norge?',
        'What does it mean that crypto is a "tax realization" in Norway?',
        '[{"id": "a", "text_no": "Man må betale skatt kun når man tar ut penger til bank", "text_en": "You only pay tax when withdrawing to bank"}, {"id": "b", "text_no": "Hver handel (bytte mellom coins) er skattepliktig", "text_en": "Every trade (swap between coins) is taxable"}, {"id": "c", "text_no": "Krypto er skattefritt i Norge", "text_en": "Crypto is tax free in Norway"}, {"id": "d", "text_no": "Man betaler skatt kun på tap, ikke gevinst", "text_en": "You only pay tax on losses, not gains"}]'::jsonb,
        'b',
        'Riktig! I Norge er hver handel – inkludert bytte mellom forskjellige kryptovalutaer – en skattemessig realisasjon. Du må rapportere gevinst/tap for hver transaksjon.',
        'Correct! In Norway, every trade – including swapping between different cryptocurrencies – is a tax realization. You must report gain/loss for each transaction.',
        5
    FROM course_lessons cl
    WHERE cl.slug = 'nyheter-regulering' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    -- ============================================
    -- QUIZ QUESTIONS FOR LESSON 4
    -- ============================================
    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hvorfor er kryptomarkedet spesielt volatilt?',
        'Why is the crypto market especially volatile?',
        '[{"id": "a", "text_no": "Det er et ungt marked med lavere likviditet og 24/7 handel", "text_en": "It is a young market with lower liquidity and 24/7 trading"}, {"id": "b", "text_no": "Fordi alle krypto-investorer er uerfarne", "text_en": "Because all crypto investors are inexperienced"}, {"id": "c", "text_no": "Fordi det kun handles på ukedager", "text_en": "Because it only trades on weekdays"}, {"id": "d", "text_no": "Fordi regjeringen kontrollerer prisene", "text_en": "Because the government controls prices"}]'::jsonb,
        'a',
        'Riktig! Krypto er et ungt marked (~15 år), har lavere likviditet enn tradisjonelle markeder, handles 24/7 uten circuit breakers, og er ofte følelsesdrevet.',
        'Correct! Crypto is a young market (~15 years), has lower liquidity than traditional markets, trades 24/7 without circuit breakers, and is often emotion-driven.',
        1
    FROM course_lessons cl
    WHERE cl.slug = 'volatilitet-risiko' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva er den viktigste risikostyringsregelen ifølge leksjonen?',
        'What is the most important risk management rule according to the lesson?',
        '[{"id": "a", "text_no": "Alltid invester maksimalt for å maksimere profitt", "text_en": "Always invest maximally to maximize profit"}, {"id": "b", "text_no": "Aldri invester mer enn du kan tape", "text_en": "Never invest more than you can afford to lose"}, {"id": "c", "text_no": "Kun invester i Bitcoin", "text_en": "Only invest in Bitcoin"}, {"id": "d", "text_no": "Selg alltid etter 24 timer", "text_en": "Always sell after 24 hours"}]'::jsonb,
        'b',
        'Riktig! Den viktigste regelen er å aldri investere mer enn du kan tape. Krypto kan gå til null, så bruk kun "disponibel inntekt".',
        'Correct! The most important rule is to never invest more than you can afford to lose. Crypto can go to zero, so use only "disposable income".',
        2
    FROM course_lessons cl
    WHERE cl.slug = 'volatilitet-risiko' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva er hensikten med en stop-loss strategi?',
        'What is the purpose of a stop-loss strategy?',
        '[{"id": "a", "text_no": "Å garantere profitt", "text_en": "To guarantee profit"}, {"id": "b", "text_no": "Å begrense tap ved å selge automatisk hvis prisen faller til et bestemt nivå", "text_en": "To limit losses by automatically selling if price falls to a certain level"}, {"id": "c", "text_no": "Å kjøpe mer når prisen stiger", "text_en": "To buy more when price rises"}, {"id": "d", "text_no": "Å unngå å betale skatt", "text_en": "To avoid paying taxes"}]'::jsonb,
        'b',
        'Riktig! En stop-loss strategi begrenser tap ved å bestemme på forhånd når du skal selge (f.eks. "hvis den faller 30%, selger jeg").',
        'Correct! A stop-loss strategy limits losses by deciding in advance when to sell (e.g., "if it drops 30%, I sell").',
        3
    FROM course_lessons cl
    WHERE cl.slug = 'volatilitet-risiko' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva er forholdet mellom volatilitet og avkastning?',
        'What is the relationship between volatility and return?',
        '[{"id": "a", "text_no": "Uten volatilitet, ingen avkastning", "text_en": "Without volatility, no return"}, {"id": "b", "text_no": "Høy volatilitet garanterer alltid høy avkastning", "text_en": "High volatility always guarantees high return"}, {"id": "c", "text_no": "Volatilitet og avkastning er uavhengige", "text_en": "Volatility and return are independent"}, {"id": "d", "text_no": "Lav volatilitet gir alltid høyest avkastning", "text_en": "Low volatility always gives the highest return"}]'::jsonb,
        'a',
        'Riktig! Uten volatilitet (prissvingninger) kan man ikke ha avkastning. Men høy volatilitet uten risikostyring fører til tap. Balansen er nøkkelen.',
        'Correct! Without volatility (price fluctuations), there can be no return. But high volatility without risk management leads to losses. Balance is key.',
        4
    FROM course_lessons cl
    WHERE cl.slug = 'volatilitet-risiko' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva er anbefalt strategi for nybegynnere ifølge leksjonen?',
        'What is the recommended strategy for beginners according to the lesson?',
        '[{"id": "a", "text_no": "Start med maksimal risiko for å lære raskt", "text_en": "Start with maximum risk to learn quickly"}, {"id": "b", "text_no": "Bruk paper trading først for å lære uten å risikere ekte penger", "text_en": "Use paper trading first to learn without risking real money"}, {"id": "c", "text_no": "Kun invester når alle andre kjøper", "text_en": "Only invest when everyone else is buying"}, {"id": "d", "text_no": "Unngå diversifisering", "text_en": "Avoid diversification"}]'::jsonb,
        'b',
        'Riktig! Leksjonen anbefaler å bruke Klarpakkes paper trading for å lære uten å risikere ekte penger, teste strategier først, og bygge selvtillit gradvis.',
        'Correct! The lesson recommends using Klarpakke paper trading to learn without risking real money, test strategies first, and build confidence gradually.',
        5
    FROM course_lessons cl
    WHERE cl.slug = 'volatilitet-risiko' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    -- ============================================
    -- QUIZ QUESTIONS FOR LESSON 5
    -- ============================================
    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva er hovedspørsmålet fundamental analyse prøver å svare på?',
        'What is the main question fundamental analysis tries to answer?',
        '[{"id": "a", "text_no": "NÅR skal jeg kjøpe/selge?", "text_en": "WHEN should I buy/sell?"}, {"id": "b", "text_no": "HVORFOR beveger prisen seg?", "text_en": "WHY is the price moving?"}, {"id": "c", "text_no": "HVEM kjøper mest?", "text_en": "WHO is buying the most?"}, {"id": "d", "text_no": "HVOR er kursen neste uke?", "text_en": "WHERE will the price be next week?"}]'::jsonb,
        'b',
        'Riktig! Fundamental analyse spør "HVORFOR beveger prisen seg?" og ser på underliggende faktorer som tilbud, bruk, team og teknologi.',
        'Correct! Fundamental analysis asks "WHY is the price moving?" and looks at underlying factors like supply, utility, team, and technology.',
        1
    FROM course_lessons cl
    WHERE cl.slug = 'teknisk-vs-fundamental' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva er hovedspørsmålet teknisk analyse prøver å svare på?',
        'What is the main question technical analysis tries to answer?',
        '[{"id": "a", "text_no": "HVORFOR beveger prisen seg?", "text_en": "WHY is the price moving?"}, {"id": "b", "text_no": "NÅR skal jeg kjøpe/selge?", "text_en": "WHEN should I buy/sell?"}, {"id": "c", "text_no": "HVA er krypto?", "text_en": "WHAT is crypto?"}, {"id": "d", "text_no": "HVEM skal jeg følge?", "text_en": "WHO should I follow?"}]'::jsonb,
        'b',
        'Riktig! Teknisk analyse spør "NÅR skal jeg kjøpe/selge?" og ser på prishistorikk, mønstre og indikatorer for timing av handler.',
        'Correct! Technical analysis asks "WHEN should I buy/sell?" and looks at price history, patterns and indicators for trade timing.',
        2
    FROM course_lessons cl
    WHERE cl.slug = 'teknisk-vs-fundamental' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hvilken av følgende er et verktøy for teknisk analyse?',
        'Which of the following is a technical analysis tool?',
        '[{"id": "a", "text_no": "Team-evaluering", "text_en": "Team evaluation"}, {"id": "b", "text_no": "RSI (Relative Strength Index)", "text_en": "RSI (Relative Strength Index)"}, {"id": "c", "text_no": "Konkurrentanalyse", "text_en": "Competitor analysis"}, {"id": "d", "text_no": "Whitepaper-gjennomgang", "text_en": "Whitepaper review"}]'::jsonb,
        'b',
        'Riktig! RSI (Relative Strength Index) er et teknisk analyse-verktøy. De andre alternativene er del av fundamental analyse.',
        'Correct! RSI (Relative Strength Index) is a technical analysis tool. The other options are part of fundamental analysis.',
        3
    FROM course_lessons cl
    WHERE cl.slug = 'teknisk-vs-fundamental' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hvilken kombinasjon bruker Klarpakke?',
        'What combination does Klarpakke use?',
        '[{"id": "a", "text_no": "Kun fundamental analyse", "text_en": "Only fundamental analysis"}, {"id": "b", "text_no": "Kun teknisk analyse", "text_en": "Only technical analysis"}, {"id": "c", "text_no": "Både fundamental og teknisk analyse", "text_en": "Both fundamental and technical analysis"}, {"id": "d", "text_no": "Ingen analyse, bare tilfeldig trading", "text_en": "No analysis, just random trading"}]'::jsonb,
        'c',
        'Riktig! Klarpakke kombinerer begge metoder: Fundamental analyse for å velge coins med solid grunnlag, og tekniske indikatorer for å identifisere gode inngangspunkter.',
        'Correct! Klarpakke combines both methods: Fundamental analysis to select coins with solid foundation, and technical indicators to identify good entry points.',
        4
    FROM course_lessons cl
    WHERE cl.slug = 'teknisk-vs-fundamental' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

    INSERT INTO quiz_questions (lesson_id, question_no, question_en, options, correct_option_id, explanation_no, explanation_en, sort_order)
    SELECT 
        cl.id,
        'Hva karakteriserer typisk fundamental analyse?',
        'What typically characterizes fundamental analysis?',
        '[{"id": "a", "text_no": "Kortsiktig fokus på timing", "text_en": "Short-term focus on timing"}, {"id": "b", "text_no": "Langsiktig fokus på verdi", "text_en": "Long-term focus on value"}, {"id": "c", "text_no": "Kun candlestick-mønstre", "text_en": "Only candlestick patterns"}, {"id": "d", "text_no": "Daglig trading", "text_en": "Day trading"}]'::jsonb,
        'b',
        'Riktig! Fundamental analyse har et langsiktig fokus på verdi – å forstå HVORFOR en kryptovaluta har verdi. Teknisk analyse er mer kortsiktig og fokuserer på timing.',
        'Correct! Fundamental analysis has a long-term focus on value – understanding WHY a cryptocurrency has value. Technical analysis is more short-term and focuses on timing.',
        5
    FROM course_lessons cl
    WHERE cl.slug = 'teknisk-vs-fundamental' AND cl.module_id = v_module_id
    ON CONFLICT DO NOTHING;

END $$;
