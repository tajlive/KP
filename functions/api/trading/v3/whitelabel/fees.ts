export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

/**
 * White-label Fee Calculator API
 * 
 * POST /api/trading/v3/whitelabel/fees/calculate
 * GET /api/trading/v3/whitelabel/fees/tiers
 */


const DEFAULT_FEE_TIERS = [
  { minAUM: 0, maxAUM: 100000, managementFee: 0.015, performanceFee: 0.10, platformFee: 199, minFee: 500 },
  { minAUM: 100000, maxAUM: 500000, managementFee: 0.012, performanceFee: 0.15, platformFee: 499, minFee: 1500 },
  { minAUM: 500000, maxAUM: 1000000, managementFee: 0.010, performanceFee: 0.20, platformFee: 999, minFee: 3000 },
  { minAUM: 1000000, maxAUM: 5000000, managementFee: 0.008, performanceFee: 0.20, platformFee: 1999, minFee: 5000 },
  { minAUM: 5000000, maxAUM: Infinity, managementFee: 0.006, performanceFee: 0.25, platformFee: 4999, minFee: 10000 }
];

async function POSTHandler(request: Request, env: Env)(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const {
      clientId,
      partnerId,
      aum,
      annualPerformance,
      useRPC = true
    } = body;
    
    if (!aum || annualPerformance === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters: aum, annualPerformance' },
        { status: 400 }
      );
    }
    
    let result;
    
    if (useRPC && clientId && partnerId) {
      // Use database function for calculation with high water mark
      // @ts-expect-error - RPC function not in generated types yet
      const { data, error } = await supabase.rpc('calculate_aum_fees', {
        p_client_id: clientId,
        p_partner_id: partnerId,
        p_aum: aum,
        p_annual_performance: annualPerformance
      });
      
      if (error) {
        console.error('Fee calculation RPC error:', error);
        // Fall through to local calculation
      } else {
        result = (data as unknown[])?.[0];
      }
    }
    
    if (!result) {
      // Local calculation
      result = calculateFeesLocally(aum, annualPerformance, DEFAULT_FEE_TIERS);
    }
    
    return NextResponse.json({
      calculation: {
        aum,
        annualPerformance,
        ...result
      },
      tier: getTierForAUM(aum, DEFAULT_FEE_TIERS),
      currency: 'USD',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Fee calculation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function GETHandler(request: Request, env: Env)() {
  try {
    return NextResponse.json({
      tiers: DEFAULT_FEE_TIERS,
      currency: 'USD',
      billingFrequency: 'monthly',
      notes: [
        'Management fee charged annually',
        'Performance fee calculated with high water mark',
        'Platform fee charged monthly',
        'Minimum annual fee applies'
      ]
    });
  } catch (error) {
    console.error('Fee tiers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateFeesLocally(
  aum: number,
  annualPerformance: number,
  tiers: typeof DEFAULT_FEE_TIERS
) {
  const tier = tiers.find(t => aum >= t.minAUM && aum < t.maxAUM) || tiers[tiers.length - 1];
  
  const managementFee = Math.max(tier.minFee || 0, aum * tier.managementFee);
  const performanceFee = annualPerformance > 0 ? annualPerformance * tier.performanceFee : 0;
  const platformFee = tier.platformFee * 12;
  const totalFee = managementFee + performanceFee + platformFee;
  
  return {
    management_fee: Math.round(managementFee * 100) / 100,
    performance_fee: Math.round(performanceFee * 100) / 100,
    platform_fee: Math.round(platformFee * 100) / 100,
    total_fee: Math.round(totalFee * 100) / 100,
    effective_rate: Math.round((totalFee / aum) * 10000) / 10000
  };
}

function getTierForAUM(aum: number, tiers: typeof DEFAULT_FEE_TIERS) {
  const tier = tiers.find(t => aum >= t.minAUM && aum < t.maxAUM) || tiers[tiers.length - 1];
  const tierIndex = tiers.indexOf(tier);
  
  return {
    name: tierIndex === 0 ? 'Starter' :
          tierIndex === 1 ? 'Growth' :
          tierIndex === 2 ? 'Professional' :
          tierIndex === 3 ? 'Enterprise' : 'Institutional',
    ...tier,
    managementFeePct: `${(tier.managementFee * 100).toFixed(2)}%`,
    performanceFeePct: `${(tier.performanceFee * 100).toFixed(0)}%`
  };
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'POST') {
      return POSTHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
