#!/usr/bin/env node
/**
 * Trading Overhaul Rollout Actions
 * Run: node scripts/monitor/rollout-actions.mjs [phase]
 *
 * Phases:
 *   preview   — 10% premium users (dry-run)
 *   premium   — All premium users
 *   full      — All premium + pro users
 *   banner    — Add UI announcement banner
 *   rollback  — Revert all flags
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vuxbjlykgmzskxbclquf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PHASE = process.argv[2] || 'preview';
const DRY_RUN = process.argv.includes('--dry-run');

console.log('═══════════════════════════════════════════════════════════════');
console.log(`  🚀 TRADING OVERHAUL ROLLOUT — Phase: ${PHASE.toUpperCase()}`);
console.log(`  Dry run: ${DRY_RUN ? 'YES' : 'NO'}`);
console.log('═══════════════════════════════════════════════════════════════\n');

async function rolloutPreview() {
  console.log('📋 PHASE: Preview (10% premium users)');

  // Find premium users with active sessions
  const { data: users, error } = await supabase
    .from('user_flags')
    .select('user_id, subscription')
    .eq('subscription', 'premium')
    .limit(50);

  if (error) {
    console.error('Error fetching users:', error.message);
    return false;
  }

  console.log(`  Found ${users?.length || 0} premium users`);

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would update:');
    (users || []).forEach(u => console.log(`    - ${u.user_id} (${u.subscription})`));
    return true;
  }

  // Update flags
  const userIds = (users || []).map(u => u.user_id);
  if (userIds.length === 0) {
    console.log('  No users to update');
    return true;
  }

  const { error: updateError } = await supabase
    .from('user_flags')
    .update({
      dark_fleet: true,
      mtf_filter: true,
      updated_at: new Date().toISOString(),
    })
    .in('user_id', userIds);

  if (updateError) {
    console.error('  Error updating flags:', updateError.message);
    return false;
  }

  console.log(`  ✅ Updated ${userIds.length} users`);
  return true;
}

async function rolloutPremium() {
  console.log('📋 PHASE: Premium (all premium users)');

  const { data: count } = await supabase
    .from('user_flags')
    .select('user_id', { count: 'exact' })
    .eq('subscription', 'premium');

  console.log(`  Target: ${count?.length || 0} premium users`);

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would enable dark_fleet + mtf_filter for all premium');
    return true;
  }

  const { error } = await supabase
    .from('user_flags')
    .update({
      dark_fleet: true,
      mtf_filter: true,
      updated_at: new Date().toISOString(),
    })
    .eq('subscription', 'premium');

  if (error) {
    console.error('  Error:', error.message);
    return false;
  }

  console.log('  ✅ All premium users updated');
  return true;
}

async function rolloutFull() {
  console.log('📋 PHASE: Full (premium + pro users)');

  const { data: count } = await supabase
    .from('user_flags')
    .select('user_id', { count: 'exact' })
    .in('subscription', ['premium', 'pro']);

  console.log(`  Target: ${count?.length || 0} premium/pro users`);

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would enable for all premium + pro');
    return true;
  }

  const { error } = await supabase
    .from('user_flags')
    .update({
      dark_fleet: true,
      mtf_filter: true,
      updated_at: new Date().toISOString(),
    })
    .in('subscription', ['premium', 'pro']);

  if (error) {
    console.error('  Error:', error.message);
    return false;
  }

  console.log('  ✅ Full rollout complete');
  return true;
}

async function rollback() {
  console.log('📋 PHASE: Rollback (disable all flags)');

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would disable dark_fleet + mtf_filter for all users');
    return true;
  }

  const { error } = await supabase
    .from('user_flags')
    .update({
      dark_fleet: false,
      mtf_filter: false,
      updated_at: new Date().toISOString(),
    })
    .not('user_id', 'is', null);

  if (error) {
    console.error('  Error:', error.message);
    return false;
  }

  console.log('  ✅ Rollback complete — all flags disabled');
  return true;
}

async function addBanner() {
  console.log('📋 PHASE: Add UI Banner');

  const bannerPath = 'src/components/Announcements.tsx';
  console.log(`  Target file: ${bannerPath}`);
  console.log('  Banner text: "🚀 AI Trading 2.0 Live! Smarter signals, better entries"');

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would append announcement banner component');
    return true;
  }

  // Note: Actual banner insertion requires code modification
  // This is a placeholder — implement based on your Announcements.tsx structure
  console.log('  ⚠️ Manual step: Add banner to Announcements.tsx');
  console.log('  Suggested content:');
  console.log('    <AnnouncementBanner');
  console.log('      type="success"');
  console.log('      title="🚀 AI Trading 2.0 Live!"');
  console.log('      message="Smarter signals, multi-timeframe filtering, and dynamic position sizing now active."');
  console.log('      dismissible');
  console.log('    />');

  return true;
}

async function main() {
  let success = false;

  switch (PHASE) {
    case 'preview':
      success = await rolloutPreview();
      break;
    case 'premium':
      success = await rolloutPremium();
      break;
    case 'full':
      success = await rolloutFull();
      break;
    case 'rollback':
      success = await rollback();
      break;
    case 'banner':
      success = await addBanner();
      break;
    default:
      console.error(`Unknown phase: ${PHASE}`);
      console.log('Valid phases: preview, premium, full, rollback, banner');
      process.exit(1);
  }

  console.log('\n' + (success ? '✅ Rollout action completed' : '🔴 Rollout action FAILED'));
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
