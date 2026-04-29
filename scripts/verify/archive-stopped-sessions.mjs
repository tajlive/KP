#!/usr/bin/env node
/**
 * Archive all stopped/crashed trading sessions that are not yet archived.
 * This fixes the zombie session accumulation problem.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('🧹 Archiving stopped/crashed sessions...');

  // Count before
  const { count: beforeCount } = await supabase
    .from('trading_sessions')
    .select('*', { count: 'exact', head: true })
    .is('archived', false)
    .in('status', ['stopped', 'crashed']);

  console.log(`  Found ${beforeCount} non-archived stopped/crashed sessions`);

  if (!beforeCount) {
    console.log('  Nothing to archive.');
    return;
  }

  // Archive in batches
  const { data: sessions, error: fetchErr } = await supabase
    .from('trading_sessions')
    .select('id, user_id, status, current_capital_nok')
    .is('archived', false)
    .in('status', ['stopped', 'crashed']);

  if (fetchErr) {
    console.error('  Fetch error:', fetchErr.message);
    process.exit(1);
  }

  const batchSize = 100;
  let archived = 0;

  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize);
    const ids = batch.map(s => s.id);

    const { error } = await supabase
      .from('trading_sessions')
      .update({
        archived: true,
        archived_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (error) {
      console.error(`  Batch ${i / batchSize + 1} error:`, error.message);
    } else {
      archived += batch.length;
      console.log(`  Archived batch ${i / batchSize + 1}: ${batch.length} sessions`);
    }
  }

  console.log(`\n✅ Done! Archived ${archived} sessions.`);

  // Show impact per user
  const { data: topUsers } = await supabase
    .from('trading_sessions')
    .select('user_id, current_capital_nok')
    .is('archived', false)
    .in('status', ['active', 'stopped']);

  const userTotals = {};
  for (const s of topUsers || []) {
    userTotals[s.user_id] = (userTotals[s.user_id] || 0) + (s.current_capital_nok || 0);
  }

  const entries = Object.entries(userTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('\n📊 Top users by active+stopped capital after cleanup:');
  for (const [uid, total] of entries) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', uid)
      .maybeSingle();
    console.log(`  ${profile?.email || uid.slice(0, 8)}: ${total.toLocaleString('no-NO')} NOK`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
