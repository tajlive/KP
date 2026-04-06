// scripts/check-stripe-prices.mjs
import Stripe from 'stripe';
import fs from 'node:fs';
import path from 'node:path';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY mangler i env');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

const PRICING_FILE = path.join(process.cwd(), 'src/lib/pricing.config.ts');

const EXPECTED = {
  basis: {
    monthly: 199,
    annual: 1990,
    envMonthly: 'NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY',
    envAnnual: 'NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL',
  },
  komplett: {
    monthly: 399,
    annual: 3990,
    envMonthly: 'NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY',
    envAnnual: 'NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL',
  },
  pro: {
    monthly: 999,
    annual: 9990,
    envMonthly: 'NEXT_PUBLIC_STRIPE_PRO_PRICE_MONTHLY',
    envAnnual: 'NEXT_PUBLIC_STRIPE_PRO_PRICE_ANNUAL',
  },
};

function readPricingFile() {
  const content = fs.readFileSync(PRICING_FILE, 'utf8');
  return content;
}

function assertConfigPrices(ts) {
  let ok = true;

  const checks = [
    { tier: 'basis', key: 'monthlyPrice', expected: 199 },
    { tier: 'basis', key: 'annualPrice', expected: 1990 },
    { tier: 'komplett', key: 'monthlyPrice', expected: 399 },
    { tier: 'komplett', key: 'annualPrice', expected: 3990 },
    { tier: 'pro', key: 'monthlyPrice', expected: 999 },
    { tier: 'pro', key: 'annualPrice', expected: 9990 },
  ];

  for (const c of checks) {
    const pattern = new RegExp(
      `${c.tier}:[\\s\\S]*?${c.key}:\\s*${c.expected}`,
      'm',
    );
    if (!pattern.test(ts)) {
      console.error(`❌ ${c.tier}.${c.key} matcher ikke forventet ${c.expected} i pricing.config.ts`);
      ok = false;
    }
  }

  if (ok) {
    console.log('✅ pricing.config.ts har riktige tall (0/199/399/999).');
  }
  return ok;
}

async function assertStripePrices() {
  let ok = true;

  for (const [tier, cfg] of Object.entries(EXPECTED)) {
    const monthlyId = process.env[cfg.envMonthly];
    const annualId = process.env[cfg.envAnnual];

    if (!monthlyId || !annualId) {
      console.error(`❌ Mangler env vars for ${tier}: ${cfg.envMonthly} / ${cfg.envAnnual}`);
      ok = false;
      continue;
    }

    const monthlyPrice = await stripe.prices.retrieve(monthlyId);
    const annualPrice = await stripe.prices.retrieve(annualId);

    const monthly = monthlyPrice.unit_amount / 100;
    const annual = annualPrice.unit_amount / 100;

    if (monthly !== cfg.monthly) {
      console.error(`❌ Stripe monthly for ${tier} er ${monthly}, forventet ${cfg.monthly}`);
      ok = false;
    }
    if (annual !== cfg.annual) {
      console.error(`❌ Stripe annual for ${tier} er ${annual}, forventet ${cfg.annual}`);
      ok = false;
    }
  }

  if (ok) {
    console.log('✅ Stripe-priser matcher config (199/399/999 + årlig).');
  }

  return ok;
}

(async () => {
  const ts = readPricingFile();
  const configOk = assertConfigPrices(ts);
  const stripeOk = await assertStripePrices();

  if (!configOk || !stripeOk) {
    console.error('❌ check-stripe-prices feilet.');
    process.exit(1);
  }

  console.log('🎉 Alle pris-sjekker bestått.');
})();

