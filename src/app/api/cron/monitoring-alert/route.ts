/**
 * GET /api/cron/monitoring-alert
 *
 * Cron-triggered monitoring for /api/paper-trading/execute 502/503 errors.
 * Runs every 5 minutes via Supabase pg_cron.
 *
 * - Probes the execute endpoint with a minimal request
 * - On 502/503: logs to health_check_metrics and sends email via Resend
 * - Also checks /api/health for overall platform health
 */

import { NextResponse } from 'next/server';
import { validateCronSecret } from '@/lib/auth/cron';
import { sendEmail } from '@/lib/email/send';

export const dynamic = 'force-dynamic';

interface CheckResult {
  name: string;
  status: 'ok' | 'error' | 'warning';
  latency?: number;
  statusCode?: number;
  error?: string;
}

const ALERT_EMAIL = 'tomarnejensen@gmail.com';
const EXECUTE_URL = '/api/paper-trading/execute';

/**
 * Probe the paper-trading/execute endpoint with a lightweight POST.
 * We send an empty JSON body — the endpoint validates and either returns
 * 400 (bad request, but the endpoint is alive) or 502/503 (backend failure).
 */
async function checkExecuteEndpoint(baseUrl: string): Promise<CheckResult> {
  const start = Date.now();

  try {
    const res = await fetch(`${baseUrl}${EXECUTE_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10000),
    });

    const statusCode = res.status;
    const latency = Date.now() - start;

    // 400 = endpoint is alive (validation failed as expected with empty body)
    // 401 = auth required but endpoint is up
    // 502/503 = backend failure (børs, DB, rate, etc.)
    if (statusCode === 502 || statusCode === 503) {
      let body: { error?: string } = {};
      try { body = await res.json(); } catch { /* ignore */ }

      return {
        name: 'paper-trading-execute',
        status: 'error',
        latency,
        statusCode,
        error: body.error || `HTTP ${statusCode} — Backend tjeneste utilgjengelig`,
      };
    }

    // Any response at all means the endpoint is reachable
    return {
      name: 'paper-trading-execute',
      status: statusCode < 500 ? 'ok' : 'warning',
      latency,
      statusCode,
      error: statusCode >= 500 ? `HTTP ${statusCode}` : undefined,
    };
  } catch (error) {
    return {
      name: 'paper-trading-execute',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Klarte ikke å nå endepunktet',
    };
  }
}

/**
 * Check the main health endpoint
 */
async function checkHealthEndpoint(baseUrl: string): Promise<CheckResult> {
  const start = Date.now();

  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(10000),
    });

    const latency = Date.now() - start;

    if (!res.ok) {
      return {
        name: 'health',
        status: 'error',
        latency,
        statusCode: res.status,
        error: `/api/health returnerte ${res.status}`,
      };
    }

    return {
      name: 'health',
      status: 'ok',
      latency,
      statusCode: res.status,
    };
  } catch (error) {
    return {
      name: 'health',
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Klarte ikke å nå /api/health',
    };
  }
}

/**
 * Log monitoring result to health_check_metrics via Supabase REST API.
 * Uses service role key for write access.
 */
async function logToDatabase(result: CheckResult, baseUrl: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn('[MonitoringAlert] Mangler Supabase credentials for logging');
    return;
  }

  try {
    await fetch(`${supabaseUrl}/rest/v1/health_check_metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        overall_status: result.status === 'ok' ? 'healthy' : 'unhealthy',
        database_status: result.status === 'ok' ? 'ok' : 'error',
        database_latency_ms: result.latency ?? null,
        version: 'monitoring-alert',
        metadata: {
          check: result.name,
          status_code: result.statusCode ?? null,
          error: result.error ?? null,
        },
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error('[MonitoringAlert] Feil ved logging til DB:', err);
  }
}

/**
 * Send alert email via Resend
 */
async function sendAlertEmail(result: CheckResult, baseUrl: string): Promise<void> {
  const timestamp = new Date().toISOString();

  const html = `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Klarpakke — Monitoringsvarsel</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 32px; color: #e2e8f0; font-size: 16px; line-height: 1.6; }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #334155; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #94a3b8; }
    .value { color: #f8fafc; font-weight: 600; }
    .badge-error { display: inline-block; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #7f1d1d; color: #fca5a5; margin-bottom: 16px; }
    .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🚨 Monitoringsvarsel</h1>
    </div>
    <div class="content">
      <div class="badge-error">KRITISK — ${result.name}</div>
      <h2 style="color: #fca5a5; margin-top: 0;">Endepunktet returnerte feil</h2>
      <p><strong>${EXECUTE_URL}</strong> returnerte en serverfeil som krever handling.</p>
      <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <div class="detail-row">
          <span class="label">Statuskode</span>
          <span class="value">${result.statusCode || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Feilmelding</span>
          <span class="value">${result.error || 'Ukjent feil'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Latency</span>
          <span class="value">${result.latency ? result.latency + 'ms' : 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Tidspunkt</span>
          <span class="value">${new Date(timestamp).toLocaleString('no-NO', { timeZone: 'Europe/Oslo' })}</span>
        </div>
        <div class="detail-row">
          <span class="label">Base URL</span>
          <span class="value" style="font-size: 13px; word-break: break-all;">${baseUrl}</span>
        </div>
      </div>
      <h3 style="color: #f8fafc;">🔍 Hva bør sjekkes?</h3>
      <ul style="padding-left: 20px;">
        <li>Kraken-API — er børsen tilgjengelig?</li>
        <li>USDT/NOK kurs — fungerer valutakonverteringen?</li>
        <li>Database — er Supabase tilgjengelig?</li>
        <li>CF Worker — er Next.js-appen i live?</li>
      </ul>
      <p>Se full health-status: <a href="${baseUrl}/api/health" style="color: #60a5fa;">${baseUrl}/api/health</a></p>
    </div>
    <div class="footer">
      <p><strong>Klarpakke</strong> © 2026</p>
      <p>Dette er en automatisk monitoreringsvarsel fra cron-jobben.</p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    `🚨 Klarpakke Monitoringsvarsel`,
    ``,
    `${EXECUTE_URL} returnerte ${result.statusCode}`,
    `Feil: ${result.error || 'Ukjent feil'}`,
    `Tidspunkt: ${timestamp}`,
    `Base URL: ${baseUrl}`,
    ``,
    `Sjekk /api/health for full status: ${baseUrl}/api/health`,
  ].join('\n');

  try {
    const emailResult = await sendEmail({
      to: ALERT_EMAIL,
      subject: `🚨 Klarpakke — ${result.statusCode || 'Feil'} på ${EXECUTE_URL}`,
      html,
      text,
    });

    if (emailResult.success) {
      console.info(`[MonitoringAlert] Varsel sendt til ${ALERT_EMAIL}: ${emailResult.id}`);
    } else {
      console.error('[MonitoringAlert] Feil ved sending av varsel:', emailResult.error);
    }
  } catch (err) {
    console.error('[MonitoringAlert] Exception ved sending av varsel:', err);
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  // Auth check
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.klarpakke.no';

  // Run checks in parallel
  const [executeResult, healthResult] = await Promise.all([
    checkExecuteEndpoint(baseUrl),
    checkHealthEndpoint(baseUrl),
  ]);

  const allOk = executeResult.status === 'ok' && healthResult.status === 'ok';
  const hasError = executeResult.status === 'error' || healthResult.status === 'error';

  // Log results to health_check_metrics
  await logToDatabase(executeResult, baseUrl);

  // Send email alert on execute 502/503
  if (executeResult.status === 'error') {
    console.warn(
      `[MonitoringAlert] ⚠️ ${EXECUTE_URL} returnerte ${executeResult.statusCode}: ${executeResult.error}`
    );
    await sendAlertEmail(executeResult, baseUrl);
  }

  // Also alert if health endpoint itself is down
  if (healthResult.status === 'error') {
    console.warn(
      `[MonitoringAlert] ⚠️ /api/health returnerte ${healthResult.statusCode}: ${healthResult.error}`
    );
    // For health endpoint failures, send a different alert
    await sendEmail({
      to: ALERT_EMAIL,
      subject: `🚨 Klarpakke — /api/health er nede (${healthResult.statusCode})`,
      html: `
<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"><title>Klarpakke — Health nede</title></head>
<body style="font-family: sans-serif; background: #0f172a; padding: 20px; color: #e2e8f0;">
  <h1 style="color: #ef4444;">🚨 /api/health er nede</h1>
  <p>Health-endepunktet returnerte <strong>${healthResult.statusCode}</strong>.</p>
  <p>Feil: ${healthResult.error}</p>
  <p>Tidspunkt: ${new Date().toISOString()}</p>
</body>
</html>`,
      text: `/api/health er nede (${healthResult.statusCode}): ${healthResult.error}`,
    });
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: allOk ? 'healthy' : hasError ? 'unhealthy' : 'degraded',
    checks: {
      execute: executeResult,
      health: healthResult,
    },
  });
}

// Also support POST for pg_cron triggering
export const POST = GET;
