/**
 * Update the status of an existing cockpit_report_jobs row.
 *
 * Used by `.github/workflows/cockpit-screenshot.yml` to mark a job as running
 * or failed. The row must already exist (created by the admin API).
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jobId = process.env.COCKPIT_REPORT_JOB_ID;
const status = process.env.COCKPIT_REPORT_STATUS;
const errorMessage = process.env.COCKPIT_REPORT_ERROR || null;

if (!supabaseUrl || !serviceRoleKey || !jobId || !status) {
  throw new Error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, COCKPIT_REPORT_JOB_ID, COCKPIT_REPORT_STATUS');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing, error: selectError } = await supabase
  .from('cockpit_report_jobs')
  .select('id')
  .eq('id', jobId)
  .single();

if (selectError || !existing) {
  throw new Error(`Job ${jobId} not found in cockpit_report_jobs.`);
}

const update = { status, updated_at: new Date().toISOString() };
if (errorMessage) update.error = errorMessage;

const { error: updateError } = await supabase
  .from('cockpit_report_jobs')
  .update(update)
  .eq('id', jobId);

if (updateError) {
  throw new Error(`Failed to update cockpit_report_jobs: ${updateError.message}`);
}

console.log(`Job ${jobId} status updated to ${status}`);
