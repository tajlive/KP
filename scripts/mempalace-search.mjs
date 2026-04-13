#!/usr/bin/env node
/**
 * 🏛️ MemPalace Search Engine v2
 * Zero-dependency In-Memory FTS (Full-Text Search)
 * Rangert søk for .knowledge, .kimi/diary og docs/adr
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const QUERY = process.argv[2];
const ROOM = process.argv[3] || 'all';
const LIMIT = parseInt(process.argv[4]) || 5;

if (!QUERY) {
  console.log('Usage: node mempalace-search.mjs <query> [room] [limit]');
  process.exit(1);
}

const SEARCH_PATHS = [
  { path: '.knowledge', label: 'Knowledge' },
  { path: '.kimi', label: 'Diary', include: ['diary.jsonl'] },
  { path: 'docs/adr', label: 'ADRs' }
];

// Enkel tokenizer
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

// Rangering (TF-IDF inspirert)
function calculateScore(text, queryTokens) {
  const contentTokens = tokenize(text);
  let score = 0;
  
  queryTokens.forEach(q => {
    const count = contentTokens.filter(t => t.includes(q)).length;
    if (count > 0) {
      score += count * (q.length / 5); // Lengre ord teller mer
    }
  });

  return score;
}

function getFiles(dir, include = []) {
  let results = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const path = join(dir, file);
      const stat = statSync(path);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(path, include));
      } else {
        if (include.length > 0) {
          if (include.includes(file)) results.push(path);
        } else if (file.endsWith('.md')) {
          results.push(path);
        }
      }
    }
  } catch (e) { /* ignore missing dirs */ }
  return results;
}

async function search() {
  console.log(`🔍 Searching for: "${QUERY}" (Room: ${ROOM})\n`);
  const queryTokens = tokenize(QUERY);
  const hits = [];

  for (const target of SEARCH_PATHS) {
    const files = getFiles(target.path, target.include);
    
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      
      if (file.endsWith('.jsonl')) {
        // Diary search (per line)
        const lines = content.split('\n').filter(l => l.length > 0);
        lines.forEach(line => {
          const entry = JSON.parse(line);
          const text = `${entry.type} ${entry.task} ${entry.agent}`;
          const score = calculateScore(text, queryTokens);
          if (score > 0) {
            hits.push({
              score: score * 1.5, // Diary hits are weighted higher
              path: file,
              label: `📓 Diary [${entry.ts.split('T')[0]}]`,
              snippet: entry.task,
              type: entry.type
            });
          }
        });
      } else {
        // Markdown search
        const score = calculateScore(content, queryTokens);
        if (score > 0) {
          // Finn beste snippet (linjen med flest treff)
          const lines = content.split('\n');
          let bestSnippet = lines[0];
          let maxLineScore = -1;

          lines.forEach(line => {
            const lineScore = calculateScore(line, queryTokens);
            if (lineScore > maxLineScore) {
              maxLineScore = lineScore;
              bestSnippet = line.trim();
            }
          });

          hits.push({
            score,
            path: file,
            label: `📄 ${target.label}`,
            snippet: bestSnippet
          });
        }
      }
    }
  }

  // Sorter etter score og vis resultater
  const sortedHits = hits.sort((a, b) => b.score - a.score).slice(0, LIMIT);

  if (sortedHits.length === 0) {
    console.log('❌ Ingen treff funnet.');
    return;
  }

  sortedHits.forEach((hit, i) => {
    const color = i === 0 ? '⭐' : '  ';
    console.log(`${color} [Rank ${i+1}] Score: ${hit.score.toFixed(1)}`);
    console.log(`   Location: ${hit.label} (${hit.path})`);
    console.log(`   Result:   ${hit.snippet}`);
    console.log('');
  });

  console.log(`✅ Søk fullført. Fant ${hits.length} treff.`);
}

search();
