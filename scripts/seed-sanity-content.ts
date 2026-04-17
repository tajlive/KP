#!/usr/bin/env tsx
/**
 * Sanity Content Seed Script
 *
 * Populerer Sanity med FAQ + testimonials for Klarpakke.
 * Idempotent — bruker createOrReplace med stabile _id-er.
 *
 * Krevde env-vars (i .env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID
 *   NEXT_PUBLIC_SANITY_DATASET        (typisk "production")
 *   SANITY_API_WRITE_TOKEN            (write-token fra sanity.io/manage)
 *
 * Kjør:
 *   npx tsx scripts/seed-sanity-content.ts
 */

import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  console.error("❌ Missing NEXT_PUBLIC_SANITY_PROJECT_ID");
  process.exit(1);
}
if (!token) {
  console.error("❌ Missing SANITY_API_WRITE_TOKEN");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-04-07",
  useCdn: false,
  token,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function block(text: string) {
  return [
    {
      _type: "block",
      children: [{ _type: "span", text }],
    },
  ];
}

// ---------------------------------------------------------------------------
// FAQ — Norsk
// ---------------------------------------------------------------------------

const faqNo = [
  {
    _type: "faq",
    _id: "faq.no.hva-er-klarpakke",
    question: "Hva er Klarpakke?",
    answer: block(
      "Klarpakke er en norsk trading-plattform som kombinerer AI-drevne signaler, automatiserte strategier og opplæring. Du kan øve med lekepenger (paper trading) før du går live."
    ),
    category: "general",
    language: "no",
    order: 1,
  },
  {
    _type: "faq",
    _id: "faq.no.trygt-koble-bors",
    question: "Er det trygt å koble til børsen?",
    answer: block(
      "Ja. Vi bruker API-nøkler med lese- og handelsrettigheter, aldri uttak. Nøklene krypteres og lagres sikkert. Du beholder alltid full kontroll over dine midler."
    ),
    category: "security",
    language: "no",
    order: 2,
  },
  {
    _type: "faq",
    _id: "faq.no.hva-koster-det",
    question: "Hva koster det?",
    answer: block(
      "Vi har flere abonnementsnivåer. Student-pakken er gratis og inkluderer paper trading og basis-signaler. Oppgrader til Master, PhD eller Professor for live trading og avanserte funksjoner."
    ),
    category: "billing",
    language: "no",
    order: 3,
  },
  {
    _type: "faq",
    _id: "faq.no.kan-jeg-miste-penger",
    question: "Kan jeg miste penger?",
    answer: block(
      "Ja, all trading innebærer risiko. Derfor anbefaler vi å starte med paper trading. Sett aldri inn mer enn du kan tåle å tape, og bruk våre risikostyringsverktøy."
    ),
    category: "trading",
    language: "no",
    order: 4,
  },
  {
    _type: "faq",
    _id: "faq.no.hvilke-borser",
    question: "Hvilke børser støttes?",
    answer: block(
      "Vi støtter Binance og Coinbase i dag. Flere børser kommer. Du kobler til via API-nøkler på under to minutter."
    ),
    category: "general",
    language: "no",
    order: 5,
  },
  {
    _type: "faq",
    _id: "faq.no.ai-signaler",
    question: "Hvordan fungerer AI-signalene?",
    answer: block(
      "Vår AI analyserer markedsdata, sentiment og tekniske indikatorer i sanntid. Signalene gir kjøps- og salgsanbefalinger med forklaring, ikke finansiell rådgivning."
    ),
    category: "trading",
    language: "no",
    order: 6,
  },
];

// ---------------------------------------------------------------------------
// FAQ — Engelsk
// ---------------------------------------------------------------------------

const faqEn = [
  {
    _type: "faq",
    _id: "faq.en.what-is-klarpakke",
    question: "What is Klarpakke?",
    answer: block(
      "Klarpakke is a Norwegian trading platform combining AI-driven signals, automated strategies, and education. You can practice with paper trading before going live."
    ),
    category: "general",
    language: "en",
    order: 1,
  },
  {
    _type: "faq",
    _id: "faq.en.safe-to-connect",
    question: "Is it safe to connect my exchange?",
    answer: block(
      "Yes. We use API keys with read and trade permissions only, never withdrawal. Keys are encrypted and stored securely. You always retain full control of your funds."
    ),
    category: "security",
    language: "en",
    order: 2,
  },
  {
    _type: "faq",
    _id: "faq.en.what-does-it-cost",
    question: "What does it cost?",
    answer: block(
      "We offer several subscription tiers. The Student plan is free and includes paper trading and basic signals. Upgrade to Master, PhD, or Professor for live trading and advanced features."
    ),
    category: "billing",
    language: "en",
    order: 3,
  },
  {
    _type: "faq",
    _id: "faq.en.can-i-lose-money",
    question: "Can I lose money?",
    answer: block(
      "Yes, all trading involves risk. That's why we recommend starting with paper trading. Never deposit more than you can afford to lose, and use our risk management tools."
    ),
    category: "trading",
    language: "en",
    order: 4,
  },
  {
    _type: "faq",
    _id: "faq.en.which-exchanges",
    question: "Which exchanges are supported?",
    answer: block(
      "We support Binance and Coinbase today. More exchanges are coming. You connect via API keys in under two minutes."
    ),
    category: "general",
    language: "en",
    order: 5,
  },
  {
    _type: "faq",
    _id: "faq.en.ai-signals",
    question: "How do the AI signals work?",
    answer: block(
      "Our AI analyses market data, sentiment, and technical indicators in real time. The signals provide buy and sell recommendations with explanations, not financial advice."
    ),
    category: "trading",
    language: "en",
    order: 6,
  },
];

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

const testimonials = [
  {
    _type: "testimonial",
    _id: "testimonial.anders-h",
    name: "Anders H.",
    role: "Privatinvestor",
    quote:
      "Etter tre måneder med paper trading følte jeg meg klar for live. Klarpakkes AI-signaler har hjulpet meg å ta bedre beslutninger, og jeg har lært utrolig mye om risikostyring.",
    rating: 5,
    platform: "direct",
    isActive: true,
  },
  {
    _type: "testimonial",
    _id: "testimonial.marte-l",
    name: "Marte L.",
    role: "Økonomistudent",
    quote:
      "Jeg var skeptisk til automatisk trading, men paper-trading-funksjonen ga meg trygghet. Nå bruker jeg både manuelle og automatiske strategier, og resultatene er bedre enn forventet.",
    rating: 5,
    platform: "direct",
    isActive: true,
  },
  {
    _type: "testimonial",
    _id: "testimonial.erik-b",
    name: "Erik B.",
    role: "Tech-entreprenør",
    quote:
      "God plattform med solid AI. Jeg skulle ønske det var flere børser tilgjengelig, men Binace-integrasjonen fungerer sømløst. Kundeservicen er også rask og kompetent.",
    rating: 4,
    platform: "direct",
    isActive: true,
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  console.log("🌱 Seeding Sanity content…");
  console.log(`   Project: ${projectId} | Dataset: ${dataset}`);

  const allDocs = [...faqNo, ...faqEn, ...testimonials];

  for (const doc of allDocs) {
    try {
      await client.createOrReplace(doc);
      console.log(`   ✅ ${doc._id}`);
    } catch (err) {
      console.error(`   ❌ ${doc._id}:`, err);
      process.exitCode = 1;
    }
  }

  console.log("\n🎉 Seed complete.");
  console.log(`   ${faqNo.length} FAQ (no)`);
  console.log(`   ${faqEn.length} FAQ (en)`);
  console.log(`   ${testimonials.length} testimonials`);
}

seed();
