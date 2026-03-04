/**
 * Get Strategies Edge Function
 * Returns public strategies with performance metrics
 * Used by: /app/strategies (Fase 2) and dashboard preview
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const strategyId = url.searchParams.get('id');
    const riskLevel = url.searchParams.get('risk');
    const sortBy = url.searchParams.get('sort') || 'return'; // return, win_rate, followers

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // If specific strategy requested
    if (strategyId) {
      const { data: strategy, error } = await supabase
        .from('public_strategies')
        .select('*')
        .eq('id', strategyId)
        .single();

      if (error || !strategy) {
        return errorResponse('Strategy not found', 404);
      }

      // Cache single strategy for 5 minutes (public data)
      return jsonResponse({ strategy }, { maxAge: 300, isPrivate: false });
    }

    // List public strategies
    let query = supabase
      .from('public_strategies')
      .select('*');

    if (riskLevel) {
      query = query.eq('risk_level', riskLevel);
    }

    // Sort
    if (sortBy === 'return') {
      query = query.order('total_return_percent', { ascending: false });
    } else if (sortBy === 'win_rate') {
      query = query.order('win_rate', { ascending: false });
    } else if (sortBy === 'followers') {
      query = query.order('follower_count', { ascending: false });
    }

    const { data: strategies, error } = await query.limit(50);

    if (error) {
      console.error('Error fetching strategies:', error);
      throw error;
    }

    // Cache strategy list for 5 minutes (public data)
    return jsonResponse(
      {
        strategies: strategies || [],
        count: strategies?.length || 0,
        filters: { riskLevel, sortBy }
      },
      { maxAge: 300, isPrivate: false }
    );
  } catch (error) {
    console.error('Error:', error);
    return errorResponse('Internal server error', 500);
  }
});
