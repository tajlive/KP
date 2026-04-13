#!/usr/bin/env node
/**
 * 🏛️ MemPalace Dashboard v3
 * Terminal-basert dashboard for knowledge management
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
};

function color(name, text) {
  return `${COLORS[name]}${text}${COLORS.reset}`;
}

function box(title, content, width = 60) {
  const line = '─'.repeat(width);
  const pad = ' '.repeat(Math.max(0, width - title.length - 4));
  console.log(color('cyan', `┌${line}┐`));
  console.log(color('cyan', `│ ${color('bright', title)}${pad} │`));
  console.log(color('cyan', `├${line}┤`));
  content.forEach(row => {
    const rowPad = ' '.repeat(Math.max(0, width - row.length - 2));
    console.log(color('cyan', `│ ${row}${rowPad} │`));
  });
  console.log(color('cyan', `└${line}┘`));
}

function getStats() {
  const stats = {
    knowledge: { files: 0, size: 0 },
    diary: { entries: 0, agents: new Set() },
    adr: { files: 0 },
    memory: { files: 0 }
  };

  // Knowledge
  try {
    const files = readDirRecursive('.knowledge');
    stats.knowledge.files = files.length;
    stats.knowledge.size = files.reduce((acc, f) => acc + (statSync(f).size || 0), 0);
  } catch (e) {}

  // Diary
  try {
    const diary = readFileSync('.kimi/diary.jsonl', 'utf8');
    const lines = diary.split('\n').filter(l => l.length > 0);
    stats.diary.entries = lines.length;
    lines.forEach(line => {
      try {
        const entry = JSON.parse(line);
        if (entry.agent) stats.diary.agents.add(entry.agent);
      } catch (e) {}
    });
  } catch (e) {}

  // ADRs
  try {
    const files = readdirSync('docs/adr');
    stats.adr.files = files.filter(f => f.endsWith('.md')).length;
  } catch (e) {}

  // Memory
  try {
    const files = readDirRecursive('memory');
    stats.memory.files = files.length;
  } catch (e) {}

  return stats;
}

function readDirRecursive(dir) {
  let results = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const path = join(dir, file);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        results = results.concat(readDirRecursive(path));
      } else {
        results.push(path);
      }
    }
  } catch (e) {}
  return results;
}

function getRecentActivity(limit = 5) {
  const activities = [];
  
  // Diary entries
  try {
    const diary = readFileSync('.kimi/diary.jsonl', 'utf8');
    const lines = diary.split('\n').filter(l => l.length > 0).slice(-limit);
    lines.reverse().forEach(line => {
      try {
        const entry = JSON.parse(line);
        activities.push({
          date: entry.ts?.split('T')[0] || '?',
          type: entry.type,
          agent: entry.agent,
          task: entry.task?.substring(0, 40) + (entry.task?.length > 40 ? '...' : ''),
          status: entry.status
        });
      } catch (e) {}
    });
  } catch (e) {}
  
  return activities;
}

function getKnowledgeRooms() {
  const rooms = [];
  try {
    const dirs = readdirSync('.knowledge');
    dirs.forEach(dir => {
      const path = join('.knowledge', dir);
      try {
        const stat = statSync(path);
        if (stat.isDirectory()) {
          const files = readDirRecursive(path).length;
          rooms.push({ name: dir, files });
        }
      } catch (e) {}
    });
  } catch (e) {}
  return rooms.sort((a, b) => b.files - a.files);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getTypeIcon(type) {
  const icons = {
    FEAT: '✨',
    FIX: '🐛',
    OPT: '⚡',
    REF: '♻️',
    DOCS: '📚',
    TEST: '🧪',
    AUTO: '🤖'
  };
  return icons[type] || '📝';
}

function getStatusColor(status) {
  if (status === 'GO' || status === 'DONE') return 'green';
  if (status === 'NO-GO') return 'red';
  return 'yellow';
}

// Main dashboard
console.clear();
console.log('');
console.log(color('bright', color('cyan', '  🏛️  MemPalace Knowledge Dashboard v3')));
console.log(color('dim', '      "Your Second Brain, Organized"'));
console.log('');

const stats = getStats();

// Stats boxes
box('📊 Knowledge Base Stats', [
  ``,
  `  ${color('blue', '📁')} Knowledge Files: ${color('bright', stats.knowledge.files.toString())}`,
  `  ${color('blue', '💾')} Total Size: ${color('bright', formatBytes(stats.knowledge.size))}`,
  `  ${color('magenta', '📓')} Diary Entries: ${color('bright', stats.diary.entries.toString())}`,
  `  ${color('magenta', '🤖')} Active Agents: ${color('bright', stats.diary.agents.size.toString())}`,
  `  ${color('yellow', '📋')} ADR Documents: ${color('bright', stats.adr.files.toString())}`,
  `  ${color('green', '🧠')} Memory Files: ${color('bright', stats.memory.files.toString())}`,
  ``
]);

console.log('');

// Knowledge rooms
const rooms = getKnowledgeRooms();
box('🏘️  Knowledge Rooms', [
  ``,
  ...rooms.slice(0, 6).map(r => 
    `  ${color('cyan', '•')} ${r.name.padEnd(20)} ${color('dim', r.files + ' files')}`
  ),
  ``
]);

console.log('');

// Recent activity
const activities = getRecentActivity(6);
box('🕐 Recent Activity', [
  ``,
  ...activities.map(a => {
    const icon = getTypeIcon(a.type);
    const statusColor = getStatusColor(a.status);
    const date = color('dim', a.date);
    const agent = color('cyan', a.agent?.substring(0, 8) || '?');
    const status = color(statusColor, a.status || '?');
    return `  ${icon} ${date} ${agent} ${status}`;
  }),
  ``,
  color('dim', '  💡 Use: ./scripts/knowledge-search.sh <query>'),
  color('dim', '  💡 Use: ./scripts/mempalace-diary-v2.sh read 10'),
  ``
]);

console.log('');
console.log(color('dim', '─'.repeat(62)));
console.log(color('dim', '  MemPalace v3.0 | Fase 2.2 + Dashboard aktivert'));
console.log('');
