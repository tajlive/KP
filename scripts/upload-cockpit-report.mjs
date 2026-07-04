/**
 * Upload Cockpit screenshot PNGs to a private Supabase Storage bucket and update
 * the corresponding cockpit_report_jobs row with a signed URL (24h expiry).
 *
 * This script is invoked by `.github/workflows/cockpit-screenshot.yml` after the
 * Playwright runner has produced `report-manifest.json`.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jobId = process.env.COCKPIT_REPORT_JOB_ID;
const targetUserId = process.env.COCKPIT_REPORT_TARGET_USER_ID || 'Viking_NO';
const outputDir = process.env.COCKPIT_REPORT_OUTPUT_DIR || process.env.COCKPIT_PREVIEW_OUTPUT_DIR || path.join(process.cwd(), 'tmp', 'cockpit-reports');
const bucketName = 'cockpit-reports';
const signedUrlExpiry = 60 * 60 * 24; // 24 hours

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!jobId) {
    throw new Error('Missing COCKPIT_REPORT_JOB_ID');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the job row was pre-created by the admin API.
  const { data: existing, error: selectError } = await supabase
    .from('cockpit_report_jobs')
    .select('id')
    .eq('id', jobId)
    .single();
  if (selectError || !existing) {
    throw new Error(`Job ${jobId} not found in cockpit_report_jobs. Ensure the admin API created it before triggering the workflow.`);
  }

  // Ensure the bucket exists (migration is the source of truth; this is a runtime guard).
  const { error: bucketError } = await supabase.storage.getBucket(bucketName);
  if (bucketError) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/png'],
    });
    if (createError) throw new Error(`Failed to create storage bucket ${bucketName}: ${createError.message}`);
  }

  const manifestPath = path.join(outputDir, 'report-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const uploadedFiles = [];
  for (const file of manifest.files || []) {
    const filePath = file.filePath || path.join(outputDir, file.fileName);
    const storagePath = `${jobId}/${file.fileName}`;
    const fileBuffer = fs.readFileSync(filePath);
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      });
    if (uploadError) {
      throw new Error(`Upload failed for ${file.fileName}: ${uploadError.message}`);
    }
    uploadedFiles.push({ ...file, storagePath });
  }

  // Create signed URLs for each uploaded file (24h).
  const signedFiles = [];
  for (const file of uploadedFiles) {
    const { data, error: signError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(file.storagePath, signedUrlExpiry);
    if (signError) {
      throw new Error(`Signed URL failed for ${file.fileName}: ${signError.message}`);
    }
    signedFiles.push({
      tab: file.tab,
      fileName: file.fileName,
      size: file.size,
      dimensions: file.dimensions,
      path: file.storagePath,
      signedUrl: data.signedUrl,
    });
  }

  const primarySignedUrl = signedFiles[0]?.signedUrl || null;
  const expiresAt = new Date(Date.now() + signedUrlExpiry * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('cockpit_report_jobs')
    .update({
      status: 'done',
      signed_url: primarySignedUrl,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (updateError) {
    throw new Error(`Failed to update cockpit_report_jobs: ${updateError.message}`);
  }

  console.log(`Job ${jobId} updated. Signed URL expires at ${expiresAt}.`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n## Cockpit Report ${jobId}\n`);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `**Target user:** ${targetUserId}\n`);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `**Status:** done\n`);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `**Expires:** ${expiresAt}\n\n`);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `**Files:**\n`);
    for (const f of signedFiles) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${f.tab}: ${f.fileName}\n`);
    }
  }
}

main().catch(err => {
  console.error('Upload failed:', err.message);
  process.exit(1);
});
