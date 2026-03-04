import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface ProductConfig {
  tier_slug: string;
  name_no: string;
  name_en: string;
  description_no: string;
  description_en: string;
  amount_nok: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-01-27.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

async function getSupabaseClient() {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.0');
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Hent eller opprett Stripe-produkt for en tier
 */
async function syncProduct(config: ProductConfig): Promise<{ productId: string; priceId: string }> {
  // Hvis vi allerede har product og price ID, sjekk at de eksisterer
  if (config.stripe_product_id && config.stripe_price_id) {
    try {
      const product = await stripe.products.retrieve(config.stripe_product_id);
      const price = await stripe.prices.retrieve(config.stripe_price_id);
      if (product.active && price.active) {
        console.log(`[${config.tier_slug}] Product and price already exist in Stripe`);
        return { productId: config.stripe_product_id, priceId: config.stripe_price_id };
      }
    } catch (e) {
      console.log(`[${config.tier_slug}] Existing IDs invalid, creating new...`);
    }
  }

  // Opprett nytt produkt
  console.log(`[${config.tier_slug}] Creating new Stripe product...`);
  const product = await stripe.products.create({
    name: config.name_no,
    description: config.description_no,
    metadata: {
      tier_slug: config.tier_slug,
      name_en: config.name_en,
    },
  });

  // Opprett price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: config.amount_nok,
    currency: 'nok',
    recurring: {
      interval: 'month',
      interval_count: 1,
    },
    metadata: {
      tier_slug: config.tier_slug,
    },
  });

  console.log(`[${config.tier_slug}] Created: product=${product.id}, price=${price.id}`);
  return { productId: product.id, priceId: price.id };
}

/**
 * Sync alle produkter fra databasen med Stripe
 */
async function syncAllProducts(): Promise<{ success: boolean; message: string; products?: any[] }> {
  const supabase = await getSupabaseClient();

  // Hent alle produkter fra databasen
  const { data: products, error } = await supabase
    .from('stripe_products')
    .select('*')
    .eq('is_active', true)
    .order('amount_nok', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  const results = [];

  for (const product of products || []) {
    try {
      const { productId, priceId } = await syncProduct(product);

      // Oppdater databasen med nye IDs
      const { error: updateError } = await supabase
        .from('stripe_products')
        .update({
          stripe_product_id: productId,
          stripe_price_id: priceId,
          updated_at: new Date().toISOString(),
        })
        .eq('tier_slug', product.tier_slug);

      if (updateError) {
        console.error(`[${product.tier_slug}] Failed to update database:`, updateError);
      }

      results.push({
        tier: product.tier_slug,
        name: product.name_no,
        amount: product.amount_nok,
        productId,
        priceId,
        status: 'synced',
      });
    } catch (err: any) {
      console.error(`[${product.tier_slug}] Sync failed:`, err.message);
      results.push({
        tier: product.tier_slug,
        name: product.name_no,
        error: err.message,
        status: 'failed',
      });
    }
  }

  return {
    success: true,
    message: `Synced ${results.filter(r => r.status === 'synced').length}/${results.length} products`,
    products: results,
  };
}

/**
 * Hent alle produkter (for frontend)
 */
async function getProducts(): Promise<{ success: boolean; products?: any[]; error?: string }> {
  const supabase = await getSupabaseClient();

  const { data: products, error } = await supabase
    .from('stripe_products')
    .select('tier_slug, name_no, name_en, description_no, description_en, amount_nok, stripe_price_id, interval, is_active')
    .eq('is_active', true)
    .order('amount_nok', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  // Formater for frontend
  const formatted = products?.map(p => ({
    tier: p.tier_slug,
    name: { no: p.name_no, en: p.name_en },
    description: { no: p.description_no, en: p.description_en },
    price: p.amount_nok,
    priceId: p.stripe_price_id,
    interval: p.interval,
  })) || [];

  return { success: true, products: formatted };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // GET /stripe-products - Hent produkter for frontend
    if (req.method === 'GET') {
      const result = await getProducts();
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /stripe-products/sync - Sync med Stripe (krever auth)
    if (req.method === 'POST' && path === 'sync') {
      // Sjekk auth header (service role eller admin)
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(-10) || 'invalid')) {
        // Forenklet auth-sjekk - i produksjon bør dette være mer robust
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await syncAllProducts();
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
