import { createClient } from '@supabase/supabase-js';
import { env } from '$lib/env';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

export async function load({ locals }) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw redirect(302, '/login');
  }

  // Metrics query
  const { data: metrics } = await supabase
    .from('analytics')
    .select('*')
    .gte('timestamp', new Date(Date.now() - 24*60*60*1000).toISOString())
    .order('timestamp', { ascending: false });

  return {
    metrics,
    session
  };
}

export const load = load;