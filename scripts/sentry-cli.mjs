#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// KLARPAKKE — Sentry CLI Tool
// Automatisk sjekk av errors, alerts og deployment-status
// ═══════════════════════════════════════════════════════════════

import { config } from 'dotenv';
config({ path: '.env.local' });

const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const SENTRY_ORG = process.env.SENTRY_ORG || 'klarpakke';
const SENTRY_PROJECT = process.env.SENTRY_PROJECT || 'klarpakke';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(type, message) {
  const colors = {
    error: COLORS.red,
    success: COLORS.green,
    warning: COLORS.yellow,
    info: COLORS.blue
  };
  console.log(`${colors[type] || ''}[${type.toUpperCase()}]${COLORS.reset} ${message}`);
}

async function sentryApi(path, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `https://sentry.io/api/0${path}${queryString ? '?' + queryString : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${SENTRY_AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  return response.json();
}

async function checkIssues(statsPeriod = '30m') {
  log('info', `Checking issues (last ${statsPeriod})...`);
  
  try {
    const issues = await sentryApi(
      `/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/`,
      { statsPeriod, environment: 'production' }
    );
    
    const errorCount = issues.length;
    
    if (errorCount === 0) {
      log('success', `✅ ZERO errors in last ${statsPeriod} — PERFECT!`);
      return { ok: true, count: 0, issues: [] };
    }
    
    log('error', `⚠️  Found ${errorCount} error(s) in last ${statsPeriod}`);
    
    // Vis de 3 siste
    issues.slice(0, 3).forEach((issue, i) => {
      console.log(`\n  ${i + 1}. ${COLORS.bold}${issue.title}${COLORS.reset}`);
      console.log(`     Level: ${issue.level} | Status: ${issue.status}`);
      console.log(`     First seen: ${issue.firstSeen}`);
      console.log(`     Last seen: ${issue.lastSeen}`);
      console.log(`     URL: https://sentry.io${issue.permalink}`);
    });
    
    return { ok: false, count: errorCount, issues };
  } catch (error) {
    log('error', `Failed to check issues: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

async function checkIssuesDetailed(statsPeriod = '24h') {
  log('info', `Checking all issues (last ${statsPeriod})...`);
  
  try {
    const issues = await sentryApi(
      `/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/`,
      { statsPeriod, environment: 'production' }
    );
    
    const totalCount = issues.length;
    
    if (totalCount === 0) {
      log('success', `✅ ZERO errors in last ${statsPeriod}`);
      return;
    }
    
    // Kategoriser issues
    const categories = {
      coldStart: [],
      kvLatency: [],
      preLaunchType: [],
      unknownProd: [],
      other: []
    };
    
    issues.forEach(issue => {
      const title = issue.title.toLowerCase();
      const lastSeen = new Date(issue.lastSeen);
      const deployTime = new Date('2026-03-31T06:45:00'); // Dagens deploy
      const isRecent = lastSeen > deployTime;
      
      // Kategorisering
      if (title.includes('cold') || title.includes('functions cold') || title.includes('startup')) {
        categories.coldStart.push(issue);
      } else if (title.includes('kv') || title.includes('redis') || title.includes('cache latency')) {
        categories.kvLatency.push(issue);
      } else if (title.includes('type error') || title.includes('typescript') || title.includes('build')) {
        categories.preLaunchType.push(issue);
      } else if (isRecent && issue.level === 'error') {
        categories.unknownProd.push(issue);
      } else {
        categories.other.push(issue);
      }
    });
    
    // Vis kategorisering
    console.log(`\n${COLORS.bold}📊 ISSUE BREAKDOWN (${totalCount} total)${COLORS.reset}\n`);
    
    // Cold start warnings
    if (categories.coldStart.length > 0) {
      console.log(`${COLORS.yellow}❄️  Cold Start Warnings (${categories.coldStart.length}) — IGNORE${COLORS.reset}`);
      categories.coldStart.slice(0, 2).forEach(i => {
        console.log(`   • ${i.title.substring(0, 60)}`);
      });
      if (categories.coldStart.length > 2) console.log(`   ... and ${categories.coldStart.length - 2} more`);
      console.log(`   ${COLORS.blue}→ Keepalive cron fikser dette${COLORS.reset}\n`);
    }
    
    // KV latency
    if (categories.kvLatency.length > 0) {
      console.log(`${COLORS.yellow}🗄️  KV Latency Breadcrumbs (${categories.kvLatency.length}) — IGNORE${COLORS.reset}`);
      categories.kvLatency.slice(0, 2).forEach(i => {
        console.log(`   • ${i.title.substring(0, 60)}`);
      });
      if (categories.kvLatency.length > 2) console.log(`   ... and ${categories.kvLatency.length - 2} more`);
      console.log(`   ${COLORS.blue}→ Under 1000ms terskel, OK${COLORS.reset}\n`);
    }
    
    // Pre-launch type errors
    if (categories.preLaunchType.length > 0) {
      console.log(`${COLORS.blue}⚙️  Pre-Launch Type Errors (${categories.preLaunchType.length}) — RESOLVE BULK${COLORS.reset}`);
      categories.preLaunchType.slice(0, 3).forEach(i => {
        console.log(`   • ${i.title.substring(0, 60)}`);
        console.log(`     ${COLORS.blue}https://sentry.io${i.permalink}${COLORS.reset}`);
      });
      if (categories.preLaunchType.length > 3) console.log(`   ... and ${categories.preLaunchType.length - 3} more`);
      console.log(`   ${COLORS.blue}→ Bulk resolve i Sentry dashboard${COLORS.reset}\n`);
    }
    
    // Unknown prod errors
    if (categories.unknownProd.length > 0) {
      console.log(`${COLORS.red}🚨 UKJENTE PROD-ERRORS (${categories.unknownProd.length}) — LINEAR P0!${COLORS.reset}`);
      categories.unknownProd.forEach((i, idx) => {
        console.log(`   ${idx + 1}. ${COLORS.bold}${i.title}${COLORS.reset}`);
        console.log(`      Level: ${i.level} | Sist sett: ${i.lastSeen}`);
        console.log(`      ${COLORS.red}https://sentry.io${i.permalink}${COLORS.reset}`);
        console.log(`      ${COLORS.red}→ Opprett Linear P0 umiddelbart!${COLORS.reset}\n`);
      });
    }
    
    // Andre
    if (categories.other.length > 0) {
      console.log(`${COLORS.blue}📋 Andre (${categories.other.length}) — VURDER${COLORS.reset}`);
      categories.other.slice(0, 2).forEach(i => {
        console.log(`   • ${i.title.substring(0, 60)}`);
      });
      if (categories.other.length > 2) console.log(`   ... and ${categories.other.length - 2} more`);
      console.log();
    }
    
    // Oppsummering
    console.log('='.repeat(60));
    console.log(`${COLORS.bold}AKSJON:${COLORS.reset}`);
    if (categories.unknownProd.length > 0) {
      console.log(`${COLORS.red}❌ Kritiske: ${categories.unknownProd.length} nye prod-errors → Linear P0${COLORS.reset}`);
    }
    if (categories.preLaunchType.length > 0) {
      console.log(`${COLORS.blue}⚙️  Bulk resolve: ${categories.preLaunchType.length} type errors i Sentry${COLORS.reset}`);
    }
    console.log(`${COLORS.yellow}✓ Ignorer: ${categories.coldStart.length + categories.kvLatency.length} cold/KV issues${COLORS.reset}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    log('error', `Failed: ${error.message}`);
  }
}

async function checkDeployment() {
  log('info', 'Checking deployment releases...');
  
  try {
    const releases = await sentryApi(
      `/organizations/${SENTRY_ORG}/releases/`,
      { project: SENTRY_PROJECT, per_page: 5 }
    );
    
    if (releases.length === 0) {
      log('warning', 'No releases found');
      return;
    }
    
    console.log(`\n${COLORS.bold}Latest Releases:${COLORS.reset}`);
    releases.forEach(release => {
      const date = new Date(release.dateCreated).toLocaleString();
      const hasErrors = release.newGroups > 0;
      const icon = hasErrors ? '❌' : '✅';
      const color = hasErrors ? COLORS.red : COLORS.green;
      console.log(`  ${icon} ${color}${release.version}${COLORS.reset} — ${date}`);
      if (release.newGroups > 0) {
        console.log(`     ⚠️  ${release.newGroups} new issue(s)`);
      }
    });
  } catch (error) {
    log('error', `Failed to check releases: ${error.message}`);
  }
}

async function checkStats() {
  log('info', 'Checking project stats...');
  
  try {
    const stats = await sentryApi(
      `/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/stats/`,
      { stat: 'received', resolution: '1h', statsPeriod: '24h' }
    );
    
    const totalEvents = stats.reduce((sum, [_, count]) => sum + count, 0);
    console.log(`\n  Total events (24h): ${totalEvents.toLocaleString()}`);
  } catch (error) {
    log('error', `Failed to check stats: ${error.message}`);
  }
}

async function createRelease(version) {
  log('info', `Creating release: ${version}...`);
  
  try {
    const response = await fetch(
      `https://sentry.io/api/0/organizations/${SENTRY_ORG}/releases/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENTRY_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version,
          projects: [SENTRY_PROJECT],
          environment: 'production'
        })
      }
    );
    
    if (response.ok) {
      log('success', `✅ Release ${version} created`);
    } else {
      throw new Error(await response.text());
    }
  } catch (error) {
    log('error', `Failed to create release: ${error.message}`);
  }
}

async function main() {
  const command = process.argv[2] || 'check';
  
  if (!SENTRY_AUTH_TOKEN) {
    log('error', 'SENTRY_AUTH_TOKEN not set in .env.local');
    log('info', 'Get token from: https://sentry.io/settings/account/api/auth-tokens/');
    process.exit(1);
  }
  
  console.log(`${COLORS.bold}🛡️  Klarpakke Sentry CLI${COLORS.reset}\n`);
  
  switch (command) {
    case 'check':
      const result = await checkIssues('30m');
      await checkDeployment();
      await checkStats();
      
      console.log('\n' + '='.repeat(50));
      if (result.ok) {
        log('success', '✅ ALL CHECKS PASSED — Launch verified!');
        process.exit(0);
      } else {
        log('error', '❌ ISSUES FOUND — Review required');
        process.exit(1);
      }
      break;
      
    case 'issues':
      await checkIssuesDetailed(process.argv[3] || '24h');
      break;
      
    case 'releases':
      await checkDeployment();
      break;
      
    case 'release':
      const version = process.argv[3] || `prod-${Date.now()}`;
      await createRelease(version);
      break;
      
    case 'monitor':
      log('info', 'Starting continuous monitoring (Ctrl+C to stop)...');
      while (true) {
        await checkIssues('5m');
        console.log('─'.repeat(50));
        await new Promise(r => setTimeout(r, 30000)); // 30s pause
      }
      break;
      
    default:
      console.log(`
Usage: node scripts/sentry-cli.mjs [command]

Commands:
  check      Full verification (default) — checks issues, releases, stats
  issues     Check recent issues only
  releases   List recent releases
  release    Create new release
  monitor    Continuous monitoring every 30s

Examples:
  node scripts/sentry-cli.mjs check
  node scripts/sentry-cli.mjs issues 1h
  node scripts/sentry-cli.mjs release v1.2.3
      `);
  }
}

main().catch(error => {
  log('error', error.message);
  process.exit(1);
});
