#!/usr/bin/env npx tsx
/**
 * Seed Sanity CMS with Klarpakke content
 *
 * Usage:
 *   npx tsx scripts/seed-sanity-content.ts
 *
 * Requires SANITY_API_WRITE_TOKEN in .env.local
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ─── Load .env.local ──────────────────────────────────────────────────────
function loadEnvLocal(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env.local');
  const env: Record<string, string> = {};
  if (!existsSync(envPath)) return env;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/\\"/g, '"');
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1).replace(/\\'/g, "'");
      }
      env[key] = value;
    }
  }
  return env;
}

const localEnv = loadEnvLocal();
for (const [k, v] of Object.entries(localEnv)) {
  if (!process.env[k]) process.env[k] = v;
}

// ─── Config ───────────────────────────────────────────────────────────────
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '63qn23si';
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-04-07';
const WRITE_TOKEN = process.env.SANITY_API_WRITE_TOKEN;

const BASE_URL = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}`;

if (!WRITE_TOKEN) {
  console.error('❌ SANITY_API_WRITE_TOKEN is not set');
  console.error('   Add it to .env.local and run again.');
  process.exit(1);
}

// ─── Portable Text helper ─────────────────────────────────────────────────
function pt(text: string): Array<{ _type: string; children: Array<{ _type: string; text: string }> }> {
  return [
    {
      _type: 'block',
      children: [{ _type: 'span', text }],
    },
  ];
}

// ─── Data: Norwegian FAQs ─────────────────────────────────────────────────
const faqsNo = [
  {
    _type: 'faq',
    question: 'Hva er Klarpakke?',
    answer: pt(
      'Klarpakke er en AI-drevet plattform for kryptotrading. Vi hjelper deg å lære trading med papirhandel (lekepenger), AI-analyser og automatisk trading — helt uten risiko i starten.'
    ),
    category: 'general',
    language: 'no',
    order: 1,
  },
  {
    _type: 'faq',
    question: 'Er det gratis å bruke?',
    answer: pt(
      'Ja, det er gratis å registrere seg og bruke papirhandel. For live trading og avanserte AI-funksjoner trenger du en betalt plan. Du kan teste alt før du betaler.'
    ),
    category: 'billing',
    language: 'no',
    order: 2,
  },
  {
    _type: 'faq',
    question: 'Hva er papirhandel?',
    answer: pt(
      'Papirhandel lar deg trade med virtuelle penger i stedet for ekte kapital. Du får sanntids markedsdata og kan teste strategier uten å risikere egne penger.'
    ),
    category: 'trading',
    language: 'no',
    order: 3,
  },
  {
    _type: 'faq',
    question: 'Hvilke krypto kan jeg trade?',
    answer: pt(
      'Klarpakke støtter de største kryptovalutaene via Binance: BTC, ETH, SOL, ADA, XRP, DOGE og mange flere. Vi legger til nye par kontinuerlig.'
    ),
    category: 'trading',
    language: 'no',
    order: 4,
  },
  {
    _type: 'faq',
    question: 'Er pengene mine trygge?',
    answer: pt(
      'Vi bruker bank-grade kryptering og to-faktor-autentisering. API-nøkler lagres kryptert i databasen, og vi har aldri tilgang til å ta ut penger fra din konto.'
    ),
    category: 'security',
    language: 'no',
    order: 5,
  },
  {
    _type: 'faq',
    question: 'Hvordan fungerer AI-tradingen?',
    answer: pt(
      'Vår AI analyserer markedsdata, tekniske indikatorer og sentiment i sanntid. Basert på din valgte strategi og risikoprofil, genererer den kjøps- og salgssignaler automatisk.'
    ),
    category: 'technical',
    language: 'no',
    order: 6,
  },
];

// ─── Data: English FAQs ───────────────────────────────────────────────────
const faqsEn = [
  {
    _type: 'faq',
    question: 'What is Klarpakke?',
    answer: pt(
      'Klarpakke is an AI-powered crypto trading platform. We help you learn trading with paper trading (virtual money), AI analysis, and automated trading — with zero risk to start.'
    ),
    category: 'general',
    language: 'en',
    order: 1,
  },
  {
    _type: 'faq',
    question: 'Is it free to use?',
    answer: pt(
      'Yes, registration and paper trading are free. Live trading and advanced AI features require a paid plan. You can test everything before paying.'
    ),
    category: 'billing',
    language: 'en',
    order: 2,
  },
  {
    _type: 'faq',
    question: 'What is paper trading?',
    answer: pt(
      'Paper trading lets you trade with virtual money instead of real capital. You get real-time market data and can test strategies without risking your own funds.'
    ),
    category: 'trading',
    language: 'en',
    order: 3,
  },
  {
    _type: 'faq',
    question: 'Which cryptocurrencies can I trade?',
    answer: pt(
      'Klarpakke supports major cryptocurrencies via Binance: BTC, ETH, SOL, ADA, XRP, DOGE and many more. We continuously add new trading pairs.'
    ),
    category: 'trading',
    language: 'en',
    order: 4,
  },
  {
    _type: 'faq',
    question: 'Is my money safe?',
    answer: pt(
      'We use bank-grade encryption and two-factor authentication. API keys are stored encrypted in our database, and we never have access to withdraw funds from your account.'
    ),
    category: 'security',
    language: 'en',
    order: 5,
  },
  {
    _type: 'faq',
    question: 'How does AI trading work?',
    answer: pt(
      'Our AI analyzes market data, technical indicators, and sentiment in real-time. Based on your chosen strategy and risk profile, it automatically generates buy and sell signals.'
    ),
    category: 'technical',
    language: 'en',
    order: 6,
  },
];

// ─── Data: Testimonials ───────────────────────────────────────────────────
const testimonials = [
  {
    _type: 'testimonial',
    name: 'Martin Holm',
    role: 'Day trader, Oslo',
    quote:
      'Gikk fra å tape penger på impulsive trades til å ha en klar strategi. AI-signalerne gir meg selvtillit når jeg går inn i markedet. Papirhandelen reddet meg fra flere dyre feil.',
    rating: 5,
    platform: 'direct',
    isActive: true,
  },
  {
    _type: 'testimonial',
    name: 'Sarah Chen',
    role: 'Software engineer, Bergen',
    quote:
      'Som teknisk person liker jeg å forstå dataen bak beslutningene. Klarpakke gir meg transparens jeg ikke fant andre steder. Backtesting-funksjonen er genial for å validere strategier.',
    rating: 5,
    platform: 'trustpilot',
    isActive: true,
  },
  {
    _type: 'testimonial',
    name: 'Erik Nilsen',
    role: 'Pensjonist, Trondheim',
    quote:
      'Trodde krypto var for komplisert for meg. Papirhandelen lærte meg grunnleggende uten stress. Nå bruker jeg auto-trading og har hatt stabil avkastning i 4 måneder.',
    rating: 4,
    platform: 'google',
    isActive: true,
  },
];

// ─── Sanity API helpers ───────────────────────────────────────────────────
async function query(groq: string, params: Record<string, any> = {}): Promise<any[]> {
  const encoded = encodeURIComponent(groq);
  let url = `${BASE_URL}/data/query/${DATASET}?query=${encoded}`;
  for (const [k, v] of Object.entries(params)) {
    url += `&$${k}=${encodeURIComponent(JSON.stringify(v))}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${WRITE_TOKEN}` },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Sanity query ${res.status}: ${JSON.stringify(data)}`);
  }
  return data.result || [];
}

async function mutate(documents: any[]) {
  const mutations = documents.map((doc) => ({ create: doc }));

  const res = await fetch(`${BASE_URL}/data/mutate/${DATASET}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WRITE_TOKEN}`,
    },
    body: JSON.stringify({ mutations }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Sanity mutate ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

// ─── Deduplication helpers ────────────────────────────────────────────────
async function getExistingFaqs(language: string): Promise<Set<string>> {
  const result = await query(
    `*[_type == "faq" && language == $language]{question}`,
    { language }
  );
  return new Set(result.map((r: any) => r.question));
}

async function getExistingTestimonials(): Promise<Set<string>> {
  const result = await query(`*[_type == "testimonial"]{name, quote}`);
  return new Set(result.map((r: any) => `${r.name}:${r.quote?.substring(0, 40)}`));
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🎨 Seeding Sanity: ${PROJECT_ID}.${DATASET}`);

  try {
    // 1. Norwegian FAQs — dedupe
    console.log(`   Checking existing Norwegian FAQs...`);
    const existingNo = await getExistingFaqs('no');
    const faqsNoFiltered = faqsNo.filter((f) => !existingNo.has(f.question));
    if (faqsNoFiltered.length === 0) {
      console.log(`   ⏭️  All ${faqsNo.length} Norwegian FAQs already exist`);
    } else {
      console.log(`   Creating ${faqsNoFiltered.length}/${faqsNo.length} Norwegian FAQs...`);
      const faqNoResult = await mutate(faqsNoFiltered);
      console.log(`   ✅ ${faqNoResult.results?.length || 0} FAQ-no created`);
    }

    // 2. English FAQs — dedupe
    console.log(`   Checking existing English FAQs...`);
    const existingEn = await getExistingFaqs('en');
    const faqsEnFiltered = faqsEn.filter((f) => !existingEn.has(f.question));
    if (faqsEnFiltered.length === 0) {
      console.log(`   ⏭️  All ${faqsEn.length} English FAQs already exist`);
    } else {
      console.log(`   Creating ${faqsEnFiltered.length}/${faqsEn.length} English FAQs...`);
      const faqEnResult = await mutate(faqsEnFiltered);
      console.log(`   ✅ ${faqEnResult.results?.length || 0} FAQ-en created`);
    }

    // 3. Testimonials — dedupe by name+quote prefix
    console.log(`   Checking existing testimonials...`);
    const existingT = await getExistingTestimonials();
    const testimonialsFiltered = testimonials.filter(
      (t) => !existingT.has(`${t.name}:${t.quote.substring(0, 40)}`)
    );
    if (testimonialsFiltered.length === 0) {
      console.log(`   ⏭️  All ${testimonials.length} testimonials already exist`);
    } else {
      console.log(`   Creating ${testimonialsFiltered.length}/${testimonials.length} testimonials...`);
      const testimonialResult = await mutate(testimonialsFiltered);
      console.log(`   ✅ ${testimonialResult.results?.length || 0} testimonials created`);
    }

    console.log('\n🎉 Done! Content seeded successfully.');
    console.log('   Run npm run dev and check /studio to verify.');
  } catch (err: any) {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  }
}

main();
