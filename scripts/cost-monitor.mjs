#!/usr/bin/env node
/**
 * 💰 Cost Monitor
 * 
 * Overvåker infrastrukturkostnader:
 * - Estimerer Cloudflare Workers kostnad (basert på plan/requests)
 * - Sjekker Supabase storage limits
 * - Genererer alerts ved threshold overskridelse
 * - Logger historikk for trend-analyse
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync, appendFileSync } from 'fs';
import { resolve } from 'path';

const __dirname = new URL('.', import.meta.url).pathname;

// Load env
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.error('❌ .env.local not found');
    process.exit(1);
  }
  
  const content = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const eq = trimmed.indexOf('=');
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const COST_THRESHOLDS = {
  supabase: {
    warning: 350,   // 70% av 500MB
    critical: 400   // 80% av 500MB
  },
  notifications: {
    warning: 50000,   // 50K rows
    critical: 100000  // 100K rows
  },
  cloudflare_estimate: {
    warning: 20,   // $20/mo
    critical: 40   // $40/mo
  }
};

async function getSupabaseMetrics() {
  // Database size
  const { data: sizeData, error: sizeError } = await supabase.rpc('exec_sql', {
    sql: `SELECT pg_database_size(current_database()) as size_bytes`
  });
  
  if (sizeError) throw sizeError;
  
  // Table sizes
  const { data: tableData, error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        relname as table_name,
        pg_total_relation_size(relid) as size_bytes,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 10
    `
  });
  
  if (tableError) throw tableError;
  
  // Connection count
  const { data: connData, error: connError } = await supabase.rpc('exec_sql', {
    sql: `SELECT count(*) as connections FROM pg_stat_activity`
  });
  
  if (connError) throw connError;
  
  return {
    database_size_bytes: sizeData?.[0]?.size_bytes || 0,
    tables: tableData || [],
    connections: connData?.[0]?.connections || 0
  };
}

async function getNotificationMetrics() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        count(*) as total_rows,
        count(*) FILTER (WHERE read = false) as unread_rows,
        count(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
        count(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d
      FROM unified_notifications
    `
  });
  
  if (error) throw error;
  
  return data?.[0] || { total_rows: 0, unread_rows: 0, last_24h: 0, last_7d: 0 };
}

async function estimateCloudflareCost() {
  // Cloudflare Workers Paid-plan estimat
  // Base: $5/mo ( Workers Paid )
  // Requests: $0.30 per million over 10M included
  // CPU: $0.0125 per million GB-seconds (krever faktisk usage-data)
  // Uten live usage bruker vi et konservativt estimat.
  const baseCost = 5;
  const estimatedRequests = 5; // millioner
  const requestCost = Math.max(0, estimatedRequests - 10) * 0.30;
  const estimatedCost = baseCost + requestCost + 2; // +$2 for CPU/reservasjon

  return {
    estimated_monthly: Math.round(estimatedCost * 100) / 100,
    base_cost: baseCost,
    request_cost: Math.round(requestCost * 100) / 100
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkThresholds(metrics) {
  const alerts = [];
  
  // Supabase storage
  const dbSizeMB = metrics.supabase.database_size_bytes / (1024 * 1024);
  if (dbSizeMB > COST_THRESHOLDS.supabase.critical) {
    alerts.push({
      level: 'critical',
      service: 'supabase',
      metric: 'database_size',
      value: formatBytes(metrics.supabase.database_size_bytes),
      threshold: COST_THRESHOLDS.supabase.critical + ' MB',
      action: 'Oppgrader til Supabase Pro eller fjern data'
    });
  } else if (dbSizeMB > COST_THRESHOLDS.supabase.warning) {
    alerts.push({
      level: 'warning',
      service: 'supabase',
      metric: 'database_size',
      value: formatBytes(metrics.supabase.database_size_bytes),
      threshold: COST_THRESHOLDS.supabase.warning + ' MB',
      action: 'Monitor growth, vurder data retention'
    });
  }
  
  // Notifications
  if (metrics.notifications.total_rows > COST_THRESHOLDS.notifications.critical) {
    alerts.push({
      level: 'critical',
      service: 'notifications',
      metric: 'unified_notifications',
      value: metrics.notifications.total_rows.toLocaleString() + ' rows',
      threshold: COST_THRESHOLDS.notifications.critical.toLocaleString() + ' rows',
      action: 'Reduser retention period eller partisjoner tabellen'
    });
  } else if (metrics.notifications.total_rows > COST_THRESHOLDS.notifications.warning) {
    alerts.push({
      level: 'warning',
      service: 'notifications',
      metric: 'unified_notifications',
      value: metrics.notifications.total_rows.toLocaleString() + ' rows',
      threshold: COST_THRESHOLDS.notifications.warning.toLocaleString() + ' rows',
      action: 'Vurder mer aggressiv retention policy'
    });
  }
  
  // Cloudflare estimate
  if (metrics.cloudflare.estimated_monthly > COST_THRESHOLDS.cloudflare_estimate.critical) {
    alerts.push({
      level: 'critical',
      service: 'cloudflare',
      metric: 'estimated_cost',
      value: '$' + metrics.cloudflare.estimated_monthly,
      threshold: '$' + COST_THRESHOLDS.cloudflare_estimate.critical,
      action: 'Sjekk Workers dashboards for faktisk usage; vurder caching/optimisering'
    });
  } else if (metrics.cloudflare.estimated_monthly > COST_THRESHOLDS.cloudflare_estimate.warning) {
    alerts.push({
      level: 'warning',
      service: 'cloudflare',
      metric: 'estimated_cost',
      value: '$' + metrics.cloudflare.estimated_monthly,
      threshold: '$' + COST_THRESHOLDS.cloudflare_estimate.warning,
      action: 'Monitor request-volum og CPU-tid'
    });
  }
  
  return alerts;
}

async function saveReport(report) {
  const reportsDir = resolve(process.cwd(), 'reports');
  if (!existsSync(reportsDir)) {
    await import('fs/promises').then(fs => fs.mkdir(reportsDir, { recursive: true }));
  }
  
  writeFileSync(
    resolve(reportsDir, 'cost-monitor-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  // Append to history
  const historyEntry = {
    timestamp: report.timestamp,
    supabase_size: report.metrics.supabase.database_size_bytes,
    notifications: report.metrics.notifications.total_rows,
    cloudflare_estimate: report.metrics.cloudflare.estimated_monthly
  };
  
  appendFileSync(
    resolve(reportsDir, 'cost-history.jsonl'),
    JSON.stringify(historyEntry) + '\n'
  );
}

function printReport(report) {
  console.log('\n' + '='.repeat(60));
  console.log('💰 COST MONITOR REPORT');
  console.log('📅', report.timestamp);
  console.log('='.repeat(60));
  
  console.log('\n📊 SUPABASE:');
  console.log(`   Database size:     ${formatBytes(report.metrics.supabase.database_size_bytes)}`);
  console.log(`   Free tier limit:   500 MB (${((report.metrics.supabase.database_size_bytes / (500*1024*1024)) * 100).toFixed(1)}% used)`);
  console.log(`   Connections:       ${report.metrics.supabase.connections}`);
  console.log('\n   Top 5 tables:');
  report.metrics.supabase.tables.slice(0, 5).forEach((table, i) => {
    console.log(`   ${i + 1}. ${table.table_name}: ${formatBytes(table.size_bytes)} (${table.row_count?.toLocaleString()} rows)`);
  });
  
  console.log('\n📬 NOTIFICATIONS:');
  console.log(`   Total rows:        ${report.metrics.notifications.total_rows?.toLocaleString()}`);
  console.log(`   Unread:            ${report.metrics.notifications.unread_rows?.toLocaleString()}`);
  console.log(`   Last 24h:          ${report.metrics.notifications.last_24h?.toLocaleString()}`);
  console.log(`   Last 7 days:       ${report.metrics.notifications.last_7d?.toLocaleString()}`);
  
  console.log('\n☁️  CLOUDFLARE WORKERS (estimert):');
  console.log(`   Monthly estimate:  $${report.metrics.cloudflare.estimated_monthly}`);
  console.log(`   Base cost (Paid):  $${report.metrics.cloudflare.base_cost}`);
  console.log(`   Request overage:   $${report.metrics.cloudflare.request_cost}`);
  
  if (report.alerts.length > 0) {
    console.log('\n🚨 ALERTS:');
    report.alerts.forEach(alert => {
      const emoji = alert.level === 'critical' ? '🔴' : '🟡';
      console.log(`\n   ${emoji} [${alert.level.toUpperCase()}] ${alert.service}`);
      console.log(`      Metric:   ${alert.metric}`);
      console.log(`      Current:  ${alert.value}`);
      console.log(`      Limit:    ${alert.threshold}`);
      console.log(`      Action:   ${alert.action}`);
    });
  } else {
    console.log('\n✅ All metrics within acceptable thresholds');
  }
  
  console.log('\n' + '='.repeat(60));
}

async function main() {
  try {
    console.log('💰 Henter kostnadsmetrikker...\n');
    
    const [supabaseMetrics, notificationMetrics, cloudflareEstimate] = await Promise.all([
      getSupabaseMetrics(),
      getNotificationMetrics(),
      estimateCloudflareCost()
    ]);
    
    const metrics = {
      supabase: supabaseMetrics,
      notifications: notificationMetrics,
      cloudflare: cloudflareEstimate
    };
    
    const alerts = checkThresholds({ metrics });
    
    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      alerts,
      summary: {
        status: alerts.length === 0 ? 'healthy' : alerts.some(a => a.level === 'critical') ? 'critical' : 'warning',
        total_alerts: alerts.length,
        critical_alerts: alerts.filter(a => a.level === 'critical').length,
        warning_alerts: alerts.filter(a => a.level === 'warning').length
      }
    };
    
    await saveReport(report);
    printReport(report);
    
    // Exit code based on severity
    if (report.summary.critical_alerts > 0) {
      process.exit(1);
    }
    if (report.summary.warning_alerts > 0) {
      process.exit(2);
    }
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Feil:', err.message);
    process.exit(3);
  }
}

main();
