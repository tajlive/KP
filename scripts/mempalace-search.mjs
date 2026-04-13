#!/usr/bin/env node
/**
 * 🏛️ MemPalace Search Engine v2.2
 * Zero-dependency In-Memory FTS med utvidet metadata
 * 
 * Features:
 * - Rangert søk med TF-IDF inspirert scoring
 * - Faceted search (type, agent, room, date)
 * - Kontekst-utdrag (±2 linjer rundt treff)
 * - Tags og entity extraction
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const QUERY = process.argv[2];
const ROOM = process.argv[3] || 'all';
const LIMIT = parseInt(process.argv[4]) || 5;

if (!QUERY) {
  console.log('Usage: node mempalace-search.mjs <query> [room] [limit]');
  console.log('       node mempalace-search.mjs <query> --agent=kimi');
  console.log('       node mempalace-search.mjs <query> --type=FEAT');
  console.log('       node mempalace-search.mjs <query> --since=2026-04-01');
  process.exit(1);
}

// Parse flags
const FLAGS = {
  agent: process.argv.find(a => a.startsWith('--agent='))?.split('=')[1],
  type: process.argv.find(a => a.startsWith('--type='))?.split('=')[1],
  since: process.argv.find(a => a.startsWith('--since='))?.split('=')[1],
  tags: process.argv.find(a => a.startsWith('--tags='))?.split('=')[1]?.split(','),
};

const SEARCH_PATHS = [
  { path: '.knowledge', label: 'Knowledge', types: ['md', 'txt'] },
  { path: '.kimi', label: 'Diary', include: ['diary.jsonl'] },
  { path: 'docs/adr', label: 'ADRs', types: ['md'] },
  { path: 'memory', label: 'Memory', types: ['md', 'txt'] }
];

// Entity patterns
const ENTITY_PATTERNS = {
  file: /`([^`]+\.(ts|tsx|js|jsx|json|md|sql))`/g,
  function: /\b(function|const|async function)\s+(\w+)/g,
  component: /<([A-Z][a-zA-Z]+)/g,
  route: /(\/api\/[^\s]+|app\/[^\s]+)/g,
  error: /(KLA-\d+|error|Error|exception|Exception)/g
};

function extractEntities(text) {
  const entities = {
    files: [],
    functions: [],
    components: [],
    routes: [],
    errors: []
  };
  
  // Extract files
  let match;
  while ((match = ENTITY_PATTERNS.file.exec(text)) !== null) {
    entities.files.push(match[1]);
  }
  
  // Extract components
  while ((match = ENTITY_PATTERNS.component.exec(text)) !== null) {
    entities.components.push(match[1]);
  }
  
  return entities;
}

// Enkel tokenizer
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

// Avansert rangering (TF-IDF inspirert + metadata boost)
function calculateScore(text, queryTokens, metadata = {}) {
  const contentTokens = tokenize(text);
  let score = 0;
  
  // Base TF-score
  queryTokens.forEach(q => {
    const count = contentTokens.filter(t => t.includes(q)).length;
    if (count > 0) {
      score += count * (q.length / 5);
    }
    // Exact match bonus
    if (contentTokens.includes(q)) {
      score += 2;
    }
  });
  
  // Metadata boosts
  if (metadata.isRecent) score *= 1.3;
  if (metadata.isHighPriority) score *= 1.5;
  if (metadata.type === 'FIX') score *= 1.2;
  
  return score;
}

function getContextSnippet(lines, matchLineIndex, windowSize = 2) {
  const start = Math.max(0, matchLineIndex - windowSize);
  const end = Math.min(lines.length, matchLineIndex + windowSize + 1);
  return lines.slice(start, end).join(' | ').substring(0, 200);
}

function getFiles(dir, include = [], types = []) {
  let results = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const path = join(dir, file);
      const stat = statSync(path);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(path, include, types));
      } else {
        if (include.length > 0) {
          if (include.includes(file)) results.push(path);
        } else if (types.length > 0) {
          if (types.some(t => file.endsWith('.' + t))) results.push(path);
        } else if (file.endsWith('.md')) {
          results.push(path);
        }
      }
    }
  } catch (e) { /* ignore missing dirs */ }
  return results;
}

function parseDate(ts) {
  if (!ts) return null;
  return new Date(ts);
}

function isAfter(date, since) {
  if (!since || !date) return true;
  const sinceDate = new Date(since);
  return date >= sinceDate;
}

async function search() {
  console.log(`🔍 MemPalace Search v2.2`);
  console.log(`   Query: "${QUERY}" | Room: ${ROOM} | Limit: ${LIMIT}`);
  if (FLAGS.agent) console.log(`   Filter: agent=${FLAGS.agent}`);
  if (FLAGS.type) console.log(`   Filter: type=${FLAGS.type}`);
  if (FLAGS.since) console.log(`   Filter: since=${FLAGS.since}`);
  console.log('');
  
  const queryTokens = tokenize(QUERY);
  const hits = [];

  for (const target of SEARCH_PATHS) {
    if (ROOM !== 'all' && !target.label.toLowerCase().includes(ROOM.toLowerCase())) {
      continue;
    }
    
    const files = getFiles(target.path, target.include, target.types);
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const entities = extractEntities(content);
      
      if (file.endsWith('.jsonl')) {
        // Diary search (per line)
        const lines = content.split('\n').filter(l => l.length > 0);
        lines.forEach((line, idx) => {
          try {
            const entry = JSON.parse(line);
            
            // Apply filters
            if (FLAGS.agent && entry.agent !== FLAGS.agent) return;
            if (FLAGS.type && entry.type !== FLAGS.type) return;
            const entryDate = parseDate(entry.ts);
            if (!isAfter(entryDate, FLAGS.since)) return;
            
            const text = `${entry.type} ${entry.task} ${entry.agent} ${entry.tags?.join(' ') || ''}`;
            const metadata = {
              isRecent: entryDate && (Date.now() - entryDate) < 7 * 24 * 60 * 60 * 1000,
              isHighPriority: entry.impact === 'high' || entry.priority === 'P0',
              type: entry.type
            };
            
            const score = calculateScore(text, queryTokens, metadata);
            if (score > 0) {
              hits.push({
                score: score * 1.5,
                path: file,
                label: `📓 Diary [${entry.ts?.split('T')[0]}]`,
                snippet: entry.task,
                type: entry.type,
                agent: entry.agent,
                priority: entry.priority,
                entities: extractEntities(entry.task),
                context: entry.alc ? `ALC: ${entry.alc}` : ''
              });
            }
          } catch (e) { /* skip invalid lines */ }
        });
      } else {
        // Markdown search
        const fileDate = statSync(file).mtime;
        const metadata = {
          isRecent: (Date.now() - fileDate) < 7 * 24 * 60 * 60 * 1000
        };
        
        const score = calculateScore(content, queryTokens, metadata);
        if (score > 0) {
          // Find best snippet with context
          const lines = content.split('\n');
          let bestSnippet = lines[0];
          let maxLineScore = -1;
          let bestLineIndex = 0;

          lines.forEach((line, idx) => {
            const lineScore = calculateScore(line, queryTokens);
            if (lineScore > maxLineScore) {
              maxLineScore = lineScore;
              bestSnippet = line.trim();
              bestLineIndex = idx;
            }
          });

          const contextSnippet = getContextSnippet(lines, bestLineIndex);

          hits.push({
            score,
            path: file,
            label: `📄 ${target.label}`,
            snippet: bestSnippet,
            context: contextSnippet,
            entities: extractEntities(content)
          });
        }
      }
    }
  }

  // Sort by score
  const sortedHits = hits.sort((a, b) => b.score - a.score).slice(0, LIMIT);

  if (sortedHits.length === 0) {
    console.log('❌ Ingen treff funnet.');
    return;
  }

  // Group by type for better visualization
  const grouped = sortedHits.reduce((acc, hit) => {
    const type = hit.type || 'Knowledge';
    if (!acc[type]) acc[type] = [];
    acc[type].push(hit);
    return acc;
  }, {});

  console.log(`✅ Fant ${hits.length} treff (viser top ${sortedHits.length}):\n`);

  sortedHits.forEach((hit, i) => {
    const rank = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
    const agent = hit.agent ? ` | 🤖 ${hit.agent}` : '';
    const priority = hit.priority ? ` | ${hit.priority}` : '';
    
    console.log(`${medal} [${rank}] Score: ${hit.score.toFixed(1)}${agent}${priority}`);
    console.log(`    📍 ${hit.label} → ${hit.path}`);
    console.log(`    📝 ${hit.snippet.substring(0, 120)}${hit.snippet.length > 120 ? '...' : ''}`);
    
    if (hit.context) {
      console.log(`    💡 ${hit.context.substring(0, 150)}...`);
    }
    
    if (hit.entities && (hit.entities.files.length > 0 || hit.entities.components.length > 0)) {
      const files = hit.entities.files.slice(0, 3).map(f => `\`${f}\``).join(', ');
      const comps = hit.entities.components.slice(0, 3).map(c => `<${c} />`).join(', ');
      if (files) console.log(`    📎 Files: ${files}`);
      if (comps) console.log(`    ⚛️  Components: ${comps}`);
    }
    
    console.log('');
  });

  // Facet summary
  console.log('─'.repeat(50));
  console.log('📊 Oppsummering:');
  Object.entries(grouped).forEach(([type, items]) => {
    console.log(`   ${type}: ${items.length} treff`);
  });
}

search();
