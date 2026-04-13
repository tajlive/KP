#!/usr/bin/env node
/**
 * 🌉 Agent Bridge v1.0
 * Overvåker og synker aktivitet mellom KIMI og Antigravity (Claude)
 * 
 * Features:
 * - Real-time agent activity monitoring
 * - Automatic handoff creation
 * - Cross-agent diary sync
 * - Task conflict detection
 * - Collaborative workflow orchestration
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

const AGENTS = {
  kimi: {
    name: 'KIMI',
    color: '\x1b[36m', // Cyan
    diaryPath: '.kimi/diary.jsonl',
    handoffPattern: /KIMI-.*\.md$/,
    specialties: ['deploy', 'verifisering', 'testing', 'i18n', 'rask fiks']
  },
  antigravity: {
    name: 'Antigravity (Claude)',
    color: '\x1b[35m', // Magenta
    diaryPath: '.claude/diary.jsonl', // Hvis Claude har egen diary
    handoffPattern: /ANTIGRAVITY-.*\.md$/,
    handoffPath: '.mempalace/handoffs',
    specialties: ['analyse', 'kompleks refaktorering', 'arkitektur', 'research']
  }
};

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m'
};

function color(name, text) {
  return `${COLORS[name] || COLORS.reset}${text}${COLORS.reset}`;
}

// ============================================================================
// Diary Reading
// ============================================================================

function readDiary(diaryPath) {
  if (!existsSync(diaryPath)) return [];
  
  try {
    const content = readFileSync(diaryPath, 'utf8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

// ============================================================================
// Handoff Management
// ============================================================================

function readHandoffs() {
  const handoffs = [];
  const handoffPath = '.mempalace/handoffs';
  
  if (!existsSync(handoffPath)) return handoffs;
  
  const files = readdirSync(handoffPath);
  
  files.forEach(file => {
    if (file.match(/ANTIGRAVITY-.*\.md$/) || file.match(/KIMI-.*\.md$/)) {
      const path = join(handoffPath, file);
      const content = readFileSync(path, 'utf8');
      const stats = statSync(path);
      
      // Parse metadata from filename (supports with or without date)
      const match = file.match(/(ANTIGRAVITY|KIMI)-(.+?)(?:-(\d{4}-\d{2}-\d{2}))?\.md$/);
      
      handoffs.push({
        file,
        path,
        from: match ? match[1].toLowerCase() : 'unknown',
        task: match ? match[2] : 'unknown',
        date: match ? match[3] : null,
        content,
        size: content.length,
        modified: stats.mtime,
        status: content.includes('Status: DONE') ? 'DONE' :
                content.includes('Status: AWAITING') ? 'AWAITING' :
                content.includes('Status: IN_PROGRESS') ? 'IN_PROGRESS' : 'UNKNOWN'
      });
    }
  });
  
  return handoffs.sort((a, b) => b.modified - a.modified);
}

// ============================================================================
// Activity Detection
// ============================================================================

function detectActivity() {
  const activity = {
    kimi: { recent: [], total: 0, lastActive: null },
    antigravity: { recent: [], total: 0, lastActive: null }
  };
  
  // Read KIMI diary
  const kimiDiary = readDiary('.kimi/diary.jsonl');
  activity.kimi.total = kimiDiary.length;
  activity.kimi.recent = kimiDiary.slice(-5).reverse();
  if (kimiDiary.length > 0) {
    activity.kimi.lastActive = kimiDiary[kimiDiary.length - 1].ts;
  }
  
  // Read handoffs (Antigravity's primary communication)
  const handoffs = readHandoffs();
  const antigravityHandoffs = handoffs.filter(h => h.from === 'antigravity');
  activity.antigravity.total = antigravityHandoffs.length;
  activity.antigravity.recent = antigravityHandoffs.slice(0, 5);
  if (antigravityHandoffs.length > 0) {
    activity.antigravity.lastActive = antigravityHandoffs[0].modified.toISOString();
  }
  
  return activity;
}

// ============================================================================
// Task Conflict Detection
// ============================================================================

function detectConflicts(activity) {
  const conflicts = [];
  
  // Check for simultaneous work on same files
  const kimiFiles = new Set();
  activity.kimi.recent.forEach(entry => {
    if (entry.files && typeof entry.files === 'string') {
      entry.files.split(',').forEach(f => kimiFiles.add(f.trim()));
    }
  });
  
  // Check handoffs for overlapping work
  activity.antigravity.recent.forEach(handoff => {
    // Simple check: look for file mentions in handoff content
    const fileMatches = handoff.content.match(/`[^`]+\.(ts|tsx|js|jsx|json)`/g) || [];
    fileMatches.forEach(file => {
      const cleanFile = file.replace(/`/g, '');
      if (kimiFiles.has(cleanFile)) {
        conflicts.push({
          type: 'FILE_OVERLAP',
          file: cleanFile,
          kimiTask: activity.kimi.recent.find(e => e.files?.includes(cleanFile))?.task,
          antigravityTask: handoff.task
        });
      }
    });
  });
  
  return conflicts;
}

// ============================================================================
// Auto Handoff Creation
// ============================================================================

function suggestHandoff(activity) {
  const suggestions = [];
  
  // Check if Antigravity has AWAITING handoffs
  const awaitingHandoffs = activity.antigravity.recent.filter(h => h.status === 'AWAITING');
  
  awaitingHandoffs.forEach(handoff => {
    suggestions.push({
      priority: 'HIGH',
      from: 'antigravity',
      to: 'kimi',
      task: handoff.task,
      reason: 'Antigravity venter på deploy/verifisering',
      action: `Les: cat .mempalace/handoffs/${handoff.file}`
    });
  });
  
  // Check if KIMI has recent FIX that needs analysis
  const recentFixes = activity.kimi.recent.filter(e => e.type === 'FIX');
  if (recentFixes.length > 0 && activity.antigravity.recent.length === 0) {
    suggestions.push({
      priority: 'MEDIUM',
      from: 'kimi',
      to: 'antigravity',
      task: recentFixes[0].task,
      reason: 'KIMI har fikset noe - kanskje Antigravity bør reviewe?',
      action: 'Vurder om analyse/root-cause er dokumentert'
    });
  }
  
  return suggestions;
}

// ============================================================================
// Dashboard Display
// ============================================================================

function showDashboard() {
  console.clear();
  console.log('');
  console.log(color('bright', color('blue', '  🌉 Agent Bridge v1.0')));
  console.log(color('dim', '     Real-time Multi-Agent Orchestration'));
  console.log('');
  
  const activity = detectActivity();
  
  // Agent Status Boxes
  const kimiLastActive = activity.kimi.lastActive 
    ? new Date(activity.kimi.lastActive).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
    : 'Aldri';
  
  const antigravityLastActive = activity.antigravity.lastActive
    ? new Date(activity.antigravity.lastActive).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
    : 'Aldri';
  
  console.log(color('cyan', '┌────────────────────────────────────────────────────────────┐'));
  console.log(color('cyan', '│') + ' ' + color('bright', 'AGENT STATUS') + ' '.repeat(45) + color('cyan', '│'));
  console.log(color('cyan', '├────────────────────────────────────────────────────────────┤'));
  console.log(color('cyan', '│') + `  ${color('cyan', '🤖 KIMI')}` + ' '.repeat(35) + `Sist aktiv: ${kimiLastActive}   ${color('cyan', '│')}`);
  console.log(color('cyan', '│') + `     ${color('dim', 'Specialties:')} deploy, testing, i18n, verifisering` + ' '.repeat(5) + color('cyan', '│'));
  console.log(color('cyan', '│') + `     ${color('dim', 'Entries:')} ${activity.kimi.total} diary entries` + ' '.repeat(21) + color('cyan', '│'));
  console.log(color('cyan', '│') + ' '.repeat(60) + color('cyan', '│'));
  console.log(color('cyan', '│') + `  ${color('magenta', '🧠 Antigravity (Claude)')}` + ' '.repeat(22) + `Sist aktiv: ${antigravityLastActive}   ${color('cyan', '│')}`);
  console.log(color('cyan', '│') + `     ${color('dim', 'Specialties:')} analyse, arkitektur, research` + ' '.repeat(8) + color('cyan', '│'));
  console.log(color('cyan', '│') + `     ${color('dim', 'Handoffs:')} ${activity.antigravity.total} aktive` + ' '.repeat(24) + color('cyan', '│'));
  console.log(color('cyan', '└────────────────────────────────────────────────────────────┘'));
  
  console.log('');
  
  // Recent Activity
  console.log(color('cyan', '┌────────────────────────────────────────────────────────────┐'));
  console.log(color('cyan', '│') + ' ' + color('bright', '🕐 Siste Aktivitet') + ' '.repeat(42) + color('cyan', '│'));
  console.log(color('cyan', '├────────────────────────────────────────────────────────────┤'));
  
  // Combine and sort recent activity
  const combined = [];
  
  activity.kimi.recent.slice(0, 3).forEach(entry => {
    combined.push({
      agent: 'kimi',
      time: entry.ts,
      type: entry.type,
      task: entry.task?.substring(0, 35) + (entry.task?.length > 35 ? '...' : ''),
      status: entry.status
    });
  });
  
  activity.antigravity.recent.slice(0, 2).forEach(handoff => {
    combined.push({
      agent: 'antigravity',
      time: handoff.modified.toISOString(),
      type: 'HANDOFF',
      task: handoff.task?.substring(0, 35),
      status: handoff.status
    });
  });
  
  combined.sort((a, b) => new Date(b.time) - new Date(a.time));
  
  combined.slice(0, 5).forEach(item => {
    const agentIcon = item.agent === 'kimi' ? color('cyan', '🤖') : color('magenta', '🧠');
    const typeIcon = item.type === 'FIX' ? '🐛' : 
                     item.type === 'FEAT' ? '✨' : 
                     item.type === 'HANDOFF' ? '📋' : '📝';
    const time = new Date(item.time).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
    const statusColor = item.status === 'GO' || item.status === 'DONE' ? 'green' : 
                        item.status === 'AWAITING' ? 'yellow' : 'white';
    
    console.log(color('cyan', '│') + `  ${agentIcon} ${time} ${typeIcon} ${color('dim', item.task)}`);
    console.log(color('cyan', '│') + `     ${color(statusColor, item.status || 'UNKNOWN')}` + ' '.repeat(50) + color('cyan', '│'));
  });
  
  console.log(color('cyan', '└────────────────────────────────────────────────────────────┘'));
  
  console.log('');
  
  // Suggestions
  const suggestions = suggestHandoff(activity);
  
  if (suggestions.length > 0) {
    console.log(color('cyan', '┌────────────────────────────────────────────────────────────┐'));
    console.log(color('cyan', '│') + ' ' + color('bright', color('yellow', '⚡ Anbefalte Handlinger')) + ' '.repeat(35) + color('cyan', '│'));
    console.log(color('cyan', '├────────────────────────────────────────────────────────────┤'));
    
    suggestions.forEach((s, i) => {
      const priorityColor = s.priority === 'HIGH' ? 'red' : 'yellow';
      const fromColor = s.from === 'kimi' ? 'cyan' : 'magenta';
      const toColor = s.to === 'kimi' ? 'cyan' : 'magenta';
      
      console.log(color('cyan', '│') + `  ${i + 1}. ${color(priorityColor, s.priority)}: ${color(fromColor, s.from)} → ${color(toColor, s.to)}`);
      console.log(color('cyan', '│') + `     ${color('dim', s.reason)}`);
      console.log(color('cyan', '│') + `     ${color('green', s.action)}`);
      console.log(color('cyan', '│'));
    });
    
    console.log(color('cyan', '└────────────────────────────────────────────────────────────┘'));
  } else {
    console.log(color('green', '  ✅ Ingen påvente handoffs. Alle agenter er synkroniserte.'));
  }
  
  // Conflicts
  const conflicts = detectConflicts(activity);
  
  if (conflicts.length > 0) {
    console.log('');
    console.log(color('red', '┌────────────────────────────────────────────────────────────┐'));
    console.log(color('red', '│') + ' ' + color('bright', color('red', '⚠️  Potensielle Konflikter')) + ' '.repeat(33) + color('red', '│'));
    console.log(color('red', '├────────────────────────────────────────────────────────────┤'));
    
    conflicts.forEach(c => {
      console.log(color('red', '│') + `  ${color('yellow', c.type)}: ${c.file}`);
      console.log(color('red', '│') + `     KIMI: ${color('dim', c.kimiTask || 'Ukjent')}`);
      console.log(color('red', '│') + `     Antigravity: ${color('dim', c.antigravityTask || 'Ukjent')}`);
      console.log(color('red', '│'));
    });
    
    console.log(color('red', '└────────────────────────────────────────────────────────────┘'));
  }
  
  console.log('');
  console.log(color('dim', '─'.repeat(62)));
  console.log(color('dim', '  Agent Bridge v1.0 | Kommandoer:'));
  console.log(color('dim', '    node scripts/agent-bridge.mjs dashboard  (denne visningen)'));
  console.log(color('dim', '    node scripts/agent-bridge.mjs handoff    (lag handoff)'));
  console.log(color('dim', '    node scripts/agent-bridge.mjs sync       (synkroniser diary)'));
  console.log(color('dim', '    node scripts/agent-bridge.mjs status     (rask status)'));
  console.log('');
}

// ============================================================================
// Handoff Creation
// ============================================================================

function createHandoff() {
  const timestamp = new Date().toISOString().split('T')[0];
  const task = process.argv[3] || 'TASK-NAME';
  
  const template = `# KIMI → Antigravity Handoff

## Fra: KIMI
## Til: Antigravity (Claude)
## Dato: ${timestamp}
## Status: AWAITING_ANALYSIS

## Oppgave
${task}

## Utført
- [ ] Beskriv hva som er gjort

## Kode-endringer
- Filer: \`path/to/file.ts\`
- Commit: \`git log --oneline -1\`

## Neste steg for Antigravity
1. [ ] Review kode-endringer
2. [ ] Analyse av løsning
3. [ ] Eventuell refaktorering
4. [ ] Dokumentasjon

## Kontekst
- Relatert til: 
- Blokkerer: 
- Avhengigheter: 

## Notater
<!-- Antigravity: Skriv her etter review -->
`;

  const filename = `.mempalace/handoffs/KIMI-${task.toUpperCase().replace(/\s+/g, '-')}-${timestamp}.md`;
  
  if (!existsSync('.mempalace/handoffs')) {
    mkdirSync('.mempalace/handoffs', { recursive: true });
  }
  
  writeFileSync(filename, template);
  console.log(color('green', `✅ Handoff opprettet: ${filename}`));
  console.log(color('dim', `   Rediger filen og beskriv oppgaven.`));
}

// ============================================================================
// Quick Status
// ============================================================================

function showStatus() {
  const activity = detectActivity();
  
  console.log(color('bright', '🌉 Agent Bridge Status'));
  console.log('');
  console.log(`🤖 KIMI:          ${activity.kimi.total} entries | Sist: ${activity.kimi.lastActive ? new Date(activity.kimi.lastActive).toLocaleString('nb-NO') : 'Aldri'}`);
  console.log(`🧠 Antigravity:   ${activity.antigravity.total} handoffs | Sist: ${activity.antigravity.lastActive ? new Date(activity.antigravity.lastActive).toLocaleString('nb-NO') : 'Aldri'}`);
  console.log('');
  
  const awaiting = activity.antigravity.recent.filter(h => h.status === 'AWAITING').length;
  if (awaiting > 0) {
    console.log(color('yellow', `⚡ ${awaiting} handoff(s) venter på handling`));
  } else {
    console.log(color('green', '✅ Ingen ventende handoffs'));
  }
}

// ============================================================================
// Sync
// ============================================================================

function syncDiaries() {
  console.log(color('bright', '🔄 Synkroniserer agenter...'));
  
  // Read both diaries
  const kimiDiary = readDiary('.kimi/diary.jsonl');
  
  // Check for cross-references
  const crossRefs = kimiDiary.filter(e => 
    e.task?.toLowerCase().includes('antigravity') ||
    e.task?.toLowerCase().includes('claude')
  );
  
  if (crossRefs.length > 0) {
    console.log(color('cyan', `  Found ${crossRefs.length} KIMI entries referencing Antigravity`));
  }
  
  // Check handoffs for KIMI references
  const handoffs = readHandoffs();
  const kimiRefs = handoffs.filter(h => 
    h.content.toLowerCase().includes('kimi') ||
    h.content.toLowerCase().includes('til: kimi')
  );
  
  if (kimiRefs.length > 0) {
    console.log(color('magenta', `  Found ${kimiRefs.length} handoffs referencing KIMI`));
  }
  
  console.log(color('green', '✅ Synkronisering fullført'));
}

// ============================================================================
// Main
// ============================================================================

const command = process.argv[2] || 'dashboard';

switch (command) {
  case 'dashboard':
    showDashboard();
    break;
  case 'handoff':
    createHandoff();
    break;
  case 'status':
    showStatus();
    break;
  case 'sync':
    syncDiaries();
    break;
  default:
    console.log('Usage: node agent-bridge.mjs [dashboard|handoff|status|sync]');
    process.exit(1);
}
