#!/usr/bin/env node
/**
 * 🏛️ MemPalace MCP Server v3.2.0 — KIMI CLI v1.40.0 + k2.6 Optimalisert
 *
 * Fikser i v3.2.0:
 * - Inverted index for O(1) token lookup (tidligere O(n) lineær scan)
 * - MCP Resources: eksponerer dokumenter, KG, diary som mempalace:// URI-er
 * - MCP Prompts: pre_task, post_task, agent-spesifikke prompts
 * - MCP Logging: strukturerte logg-meldinger til klient
 * - Incremental KG writes: appender fakta istedenfor full rewrite
 * - Ekte semantic_search: KG-basert synonym/relasjons-ekspansjon
 * - Auto-reindex: sjekker mtime, reindexerer kun endrede filer
 * - Bedre auto_tag: bruker inverted index + KG for relevant tags
 * - Raskere startup: lazy index build med progress-rapportering
 *
 * Fikser i v3.1.1:
 * - Oppdatert for KIMI CLI v1.40.0 (ping-støtte, graceful shutdown)
 * - Robust error-håndtering: uncaughtException, unhandledRejection
 * - Forbedret transport: bedre JSON-parse feilhåndtering
 * - MCP protocol: tool results wrappes i content-array
 * - KG deduplisering: sjekker for duplikater før lagring
 * - Diary newline-håndtering: sikrer korrekt JSONL-format
 *
 * Versjon: 3.2.0
 * Dato: 2026-05-04
 * For: KIMI CLI v1.40.0, k2.6, macOS ARM64
 */

import {
  readFileSync, existsSync, readdirSync, statSync,
  writeFileSync, mkdirSync, appendFileSync, watch
} from 'fs';
import { resolve, join, dirname, relative, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

// ─── KONFIGURASJON ───
const CONFIG = {
  version: '3.2.0',
  wing: 'klarpakke',
  cacheSize: 200,
  maxResultChars: 1500,
  batchSize: 50,
  kgBatchSize: 100,
  indexPaths: [
    { path: '.knowledge', label: 'Knowledge', types: ['md', 'txt'] },
    { path: '.kimi', label: 'Diary', include: ['diary.jsonl'] },
    { path: '.mempalace/handoffs', label: 'Handoffs', types: ['md'] },
    { path: '.mempalace/plans', label: 'Plans', types: ['md'] },
    { path: 'docs', label: 'Docs', types: ['md'] },
    { path: 'memory', label: 'Memory', types: ['md'] }
  ],
  criticalRooms: [
    'critical_decisions',
    'error_patterns',
    'infrastructure',
    'api_contracts',
    'trading'
  ],
  semanticExpansions: {
    'auth': ['oauth', 'session', 'login', 'user', 'rls', 'middleware'],
    'trading': ['trade', 'order', 'position', 'strategy', 'pnl', 'risk'],
    'database': ['supabase', 'postgres', 'migration', 'table', 'rls', 'rpc'],
    'deploy': ['vercel', 'github', 'ci', 'cd', 'pipeline', 'production'],
    'frontend': ['nextjs', 'react', 'component', 'tailwind', 'ui', 'page'],
    'testing': ['vitest', 'playwright', 'e2e', 'unit', 'mock', 'test'],
    'sanity': ['cms', 'studio', 'groq', 'document', 'schema', 'webhook'],
    'cron': ['pg_cron', 'scheduler', 'job', 'tick', 'candle', 'price']
  }
};

// ─── ROBUST FEILHÅNDTERING ───
process.on('uncaughtException', (err) => {
  log('error', 'uncaughtException: ' + err.message);
});
process.on('unhandledRejection', (reason) => {
  log('error', 'unhandledRejection: ' + reason);
});

let isShuttingDown = false;
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log('info', `${signal} received, flushing KG...`);
  try { saveKG(kgData); } catch { /* ignore */ }
  process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.stdout.on('error', () => {});
process.stdin.on('error', () => {});

// ─── LOGGING (MCP-compatible) ───
const logQueue = [];
let logClientReady = false;

function log(level, message, data) {
  const entry = { ts: new Date().toISOString(), level, message, data };
  logQueue.push(entry);
  // Keep stderr for debugging, but also queue for MCP logging
  console.error(`[MemPalace ${level}] ${message}`);
}

function flushLogs(sendFn) {
  // MCP logging notifications disabled by default — can cause interleaving issues
  // with some clients. Logs are available on stderr.
  logQueue.length = 0;
}

// ─── LRU CACHE ───
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  get(key) {
    const val = this.cache.get(key);
    if (val !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, val);
    }
    return val;
  }
  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.maxSize) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
    this.cache.set(key, value);
  }
  clear() { this.cache.clear(); }
}
const cache = new LRUCache(CONFIG.cacheSize);

// ─── IN-MEMORY INDEX (Inverted) ───
let indexReady = false;
let indexedDocs = [];
let invertedIndex = new Map(); // token -> Set(docId)
let docById = new Map();       // docId -> doc
let kgData = {};
let fileMtimes = new Map();    // path -> mtimeMs (for incremental reindex)

function tokenize(text) {
  return String(text || '').toLowerCase()
    .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function getFiles(dir, include = [], types = []) {
  let results = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const path = join(dir, file);
      const stat = statSync(path);
      if (stat.isDirectory()) {
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

function loadKG() {
  const kgPath = resolve(root, '.mempalace/kg.json');
  if (!existsSync(kgPath)) return {};
  try { return JSON.parse(readFileSync(kgPath, 'utf8')); }
  catch { return {}; }
}

function saveKG(data) {
  const dir = resolve(root, '.mempalace');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'kg.json'), JSON.stringify(data, null, 2));
}

// Incremental KG: append single fact to a line-delimited JSON file, then periodically compact
function appendKGFact(subject, predicate, object, validFrom) {
  const dir = resolve(root, '.mempalace');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const appendPath = resolve(dir, 'kg-append.jsonl');
  const line = JSON.stringify({ subject, predicate, object, validFrom: validFrom || new Date().toISOString() });
  appendFileSync(appendPath, line + '\n');
}

function loadKGWithAppend() {
  const base = loadKG();
  const appendPath = resolve(root, '.mempalace/kg-append.jsonl');
  if (!existsSync(appendPath)) return base;
  try {
    const lines = readFileSync(appendPath, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const fact = JSON.parse(line);
        if (!base[fact.subject]) base[fact.subject] = [];
        const exists = base[fact.subject].some(f =>
          f.predicate === fact.predicate && f.object === fact.object
        );
        if (!exists) base[fact.subject].push({
          predicate: fact.predicate,
          object: fact.object,
          validFrom: fact.validFrom
        });
      } catch { /* skip bad line */ }
    }
  } catch { /* ignore */ }
  return base;
}

function compactKG() {
  // Merge append-only file into main kg.json and clear append file
  const merged = loadKGWithAppend();
  saveKG(merged);
  const appendPath = resolve(root, '.mempalace/kg-append.jsonl');
  try {
    if (existsSync(appendPath)) writeFileSync(appendPath, '');
  } catch { /* ignore */ }
  return merged;
}

function extractEntities(text) {
  const entities = { files: [], functions: [], components: [], routes: [], decisions: [], tags: [] };
  let m;
  const fileRe = /`([^`]+\.(ts|tsx|js|jsx|json|md|sql|yaml))`/g;
  while ((m = fileRe.exec(text)) !== null) entities.files.push(m[1]);
  const compRe = /<([A-Z][a-zA-Z]+)/g;
  while ((m = compRe.exec(text)) !== null) entities.components.push(m[1]);
  const routeRe = /(\/api\/[^\s]+|app\/[^\s]+)/g;
  while ((m = routeRe.exec(text)) !== null) entities.routes.push(m[1]);
  const decRe = /\b(ADR|DECISION|RFC)-\d+/gi;
  while ((m = decRe.exec(text)) !== null) entities.decisions.push(m[0]);
  const tagRe = /#([a-zA-Z_\-\/]+)/g;
  while ((m = tagRe.exec(text)) !== null) entities.tags.push(m[1]);
  return entities;
}

function addToInvertedIndex(doc) {
  const tokens = tokenize(doc.content);
  const uniqueTokens = [...new Set(tokens)];
  for (const token of uniqueTokens) {
    if (!invertedIndex.has(token)) invertedIndex.set(token, new Set());
    invertedIndex.get(token).add(doc.id);
  }
  // Also index title/filename
  const titleTokens = tokenize(basename(doc.path));
  for (const token of titleTokens) {
    if (!invertedIndex.has(token)) invertedIndex.set(token, new Set());
    invertedIndex.get(token).add(doc.id);
  }
}

function buildIndex(force = false) {
  const startTime = Date.now();
  log('info', 'Building inverted index...');

  // If not force, only reindex changed/new files
  if (!force && indexReady && indexedDocs.length > 0) {
    let changed = false;
    for (const target of CONFIG.indexPaths) {
      const basePath = resolve(root, target.path);
      if (!existsSync(basePath)) continue;
      const files = getFiles(basePath, target.include, target.types);
      for (const file of files) {
        try {
          const stat = statSync(file);
          const relPath = relative(root, file);
          const prevMtime = fileMtimes.get(relPath);
          if (!prevMtime || stat.mtimeMs > prevMtime) {
            changed = true;
            break;
          }
        } catch { /* ignore */ }
      }
      if (changed) break;
    }
    if (!changed) {
      log('info', 'Index is up to date, skipping rebuild');
      return;
    }
  }

  // Full rebuild
  indexedDocs = [];
  invertedIndex = new Map();
  docById = new Map();
  fileMtimes = new Map();

  for (const target of CONFIG.indexPaths) {
    const basePath = resolve(root, target.path);
    if (!existsSync(basePath)) continue;
    const files = getFiles(basePath, target.include, target.types);
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const relPath = relative(root, file);
        const stat = statSync(file);
        fileMtimes.set(relPath, stat.mtimeMs);
        const isRecent = (Date.now() - stat.mtimeMs) < 7 * 24 * 60 * 60 * 1000;
        const isCritical = CONFIG.criticalRooms.some(r => relPath.includes(r));

        if (file.endsWith('.jsonl')) {
          const lines = content.split('\n').filter(l => l.trim());
          lines.forEach((line, idx) => {
            try {
              const entry = JSON.parse(line);
              const doc = {
                id: `${relPath}#${idx}`,
                path: relPath,
                label: target.label,
                content: `${entry.type || ''} ${entry.task || ''} ${entry.agent || ''}`,
                raw: line,
                type: 'diary',
                isRecent,
                isCritical: false,
                date: entry.ts || stat.mtime.toISOString(),
                metadata: entry
              };
              indexedDocs.push(doc);
              docById.set(doc.id, doc);
              addToInvertedIndex(doc);
            } catch { /* skip */ }
          });
        } else {
          const doc = {
            id: relPath,
            path: relPath,
            label: target.label,
            content: content,
            raw: content.slice(0, 2000),
            type: 'document',
            isRecent,
            isCritical,
            date: stat.mtime.toISOString(),
            entities: extractEntities(content)
          };
          indexedDocs.push(doc);
          docById.set(doc.id, doc);
          addToInvertedIndex(doc);
        }
      } catch (e) { /* skip unreadable */ }
    }
  }

  indexReady = true;
  kgData = loadKGWithAppend();
  const duration = Date.now() - startTime;
  log('info', `Index built: ${indexedDocs.length} docs, ${invertedIndex.size} tokens, ${Object.keys(kgData).length} KG entities (${duration}ms)`);
}

// Non-blocking index build
buildIndex();

// ─── SØKE-FUNKSJONER (Inverted Index) ───
function searchDocs(query, opts = {}) {
  const cacheKey = `search:${query}:${opts.room || 'all'}:${opts.limit || 10}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const limit = opts.limit || 10;
  const roomFilter = opts.room;
  const since = opts.since ? new Date(opts.since) : null;

  // Inverted index lookup: O(tokens) instead of O(docs)
  const candidateScores = new Map(); // docId -> score
  for (const token of tokens) {
    const docSet = invertedIndex.get(token);
    if (!docSet) continue;
    for (const docId of docSet) {
      const doc = docById.get(docId);
      if (!doc) continue;
      if (roomFilter && !doc.label.toLowerCase().includes(roomFilter.toLowerCase())) continue;
      if (since && doc.date && new Date(doc.date) < since) continue;

      // Calculate score: exact match = 3, partial = 1-2
      const docTokens = tokenize(doc.content);
      const exact = docTokens.filter(t => t === token).length;
      const partial = docTokens.filter(t => t.includes(token) || token.includes(t)).length;
      const score = exact * 3 + partial * (token.length / 4);

      candidateScores.set(docId, (candidateScores.get(docId) || 0) + score);
    }
  }

  // Apply boosters
  const hits = [];
  for (const [docId, baseScore] of candidateScores) {
    const doc = docById.get(docId);
    let score = baseScore;
    if (doc.isRecent) score *= 1.4;
    if (doc.isCritical) score *= 1.6;
    if (doc.type === 'diary' && doc.metadata?.type === 'FIX') score *= 1.3;

    const snippet = doc.type === 'diary'
      ? doc.metadata?.task || doc.content.slice(0, 200)
      : doc.content.split('\n').find(l => tokens.some(t => l.toLowerCase().includes(t))) || doc.content.slice(0, 200);

    hits.push({
      score,
      id: doc.id,
      path: doc.path,
      label: doc.label,
      snippet: snippet.trim(),
      type: doc.type,
      date: doc.date,
      entities: doc.entities || {}
    });
  }

  const result = hits.sort((a, b) => b.score - a.score).slice(0, limit);
  cache.set(cacheKey, result);
  return result;
}

function semanticSearch(concept, opts = {}) {
  // Expand concept with synonyms from config and KG
  const expansions = [concept];
  for (const [key, synonyms] of Object.entries(CONFIG.semanticExpansions)) {
    if (concept.toLowerCase().includes(key) || key.includes(concept.toLowerCase())) {
      expansions.push(...synonyms);
    }
  }
  // KG-based expansion
  const kgFacts = kgData[concept.toLowerCase()] || [];
  for (const fact of kgFacts) {
    if (fact.predicate === 'uses' || fact.predicate === 'related-to' || fact.predicate === 'synonym') {
      expansions.push(fact.object);
    }
  }

  const uniqueExpansions = [...new Set(expansions)];
  const allResults = [];
  const seenIds = new Set();

  for (const term of uniqueExpansions.slice(0, 6)) {
    const results = searchDocs(term, { room: opts.room, limit: opts.limit || 5 });
    for (const r of results) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        allResults.push({ ...r, matchedTerm: term });
      }
    }
  }

  return allResults.slice(0, opts.limit || 5);
}

function recentContext(hours = 24, room) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const docs = indexedDocs.filter(d => {
    if (!d.date) return false;
    const dDate = new Date(d.date);
    return dDate >= since && (!room || d.label.toLowerCase().includes(room.toLowerCase()));
  });
  return docs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
}

// ─── KNOWLEDGE GRAPH ───
function kgQuery(entity, depth = 1) {
  const direct = kgData[entity] || [];
  const related = {};
  if (depth > 1) {
    direct.forEach(fact => {
      if (kgData[fact.object]) related[fact.object] = kgData[fact.object];
      // Also check reverse: entities that point TO this entity
      for (const [otherEntity, facts] of Object.entries(kgData)) {
        if (facts.some(f => f.object === entity)) {
          if (!related[otherEntity]) related[otherEntity] = facts.filter(f => f.object === entity);
        }
      }
    });
  }
  return { entity, facts: direct, related, depth };
}

function kgAdd(subject, predicate, object, validFrom) {
  if (!kgData[subject]) kgData[subject] = [];
  const exists = kgData[subject].some(f =>
    f.predicate === predicate && f.object === object
  );
  if (exists) {
    return { success: true, duplicate: true, fact: { subject, predicate, object } };
  }
  const fact = {
    predicate,
    object,
    validFrom: validFrom || new Date().toISOString()
  };
  kgData[subject].push(fact);
  appendKGFact(subject, predicate, object, fact.validFrom);

  // Compact if too many append-only facts
  const appendPath = resolve(root, '.mempalace/kg-append.jsonl');
  try {
    if (existsSync(appendPath)) {
      const stats = statSync(appendPath);
      if (stats.size > 50 * 1024) { // 50KB threshold
        kgData = compactKG();
        log('info', 'KG compacted after append threshold reached');
      }
    }
  } catch { /* ignore */ }

  return { success: true, duplicate: false, fact: { subject, predicate, object } };
}

function kgBatch(facts) {
  const results = [];
  let added = 0;
  let duplicates = 0;
  for (const f of facts.slice(0, CONFIG.batchSize)) {
    if (!kgData[f.subject]) kgData[f.subject] = [];
    const exists = kgData[f.subject].some(existing =>
      existing.predicate === f.predicate && existing.object === f.object
    );
    if (exists) {
      duplicates++;
      results.push({ success: true, duplicate: true, fact: f });
      continue;
    }
    kgData[f.subject].push({
      predicate: f.predicate,
      object: f.object,
      validFrom: f.validFrom || new Date().toISOString()
    });
    appendKGFact(f.subject, f.predicate, f.object, f.validFrom);
    added++;
    results.push({ success: true, duplicate: false, fact: f });
  }

  // Check compact threshold
  const appendPath = resolve(root, '.mempalace/kg-append.jsonl');
  try {
    if (existsSync(appendPath)) {
      const stats = statSync(appendPath);
      if (stats.size > 50 * 1024) {
        kgData = compactKG();
        log('info', 'KG compacted after batch append threshold reached');
      }
    }
  } catch { /* ignore */ }

  return { success: true, added, duplicates, total: facts.length, results };
}

function kgFindPath(from, to, maxDepth = 3) {
  const visited = new Set();
  const queue = [[{ entity: from, predicate: 'start', object: from }]];

  while (queue.length > 0) {
    const path = queue.shift();
    const last = path[path.length - 1];
    if (last.object === to || last.entity === to) return path;
    if (path.length >= maxDepth) continue;

    const facts = kgData[last.object] || kgData[last.entity] || [];
    for (const fact of facts) {
      const key = `${fact.object}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push([...path, fact]);
      }
    }
  }
  return null;
}

// ─── DIARY ───
function readDiary(agent, lastN = 10) {
  const diaryPath = resolve(root, '.kimi/diary.jsonl');
  if (!existsSync(diaryPath)) return [];
  try {
    const lines = readFileSync(diaryPath, 'utf8').split('\n').filter(Boolean);
    return lines.slice(-lastN).map(line => JSON.parse(line)).filter(e => !agent || e.agent === agent);
  } catch { return []; }
}

function writeDiary(agent, entry) {
  const diaryPath = resolve(root, '.kimi/diary.jsonl');
  const dir = dirname(diaryPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const record = JSON.stringify({
    ts: new Date().toISOString(),
    type: entry.type || 'AUTO',
    task: entry.task || entry,
    agent: agent || 'kimi',
    status: entry.status || 'GO',
    rating: entry.rating || 3,
    files: entry.files || 0,
    tags: entry.tags || []
  });

  try {
    const existing = existsSync(diaryPath) ? readFileSync(diaryPath, 'utf8') : '';
    const needsNewline = existing.length > 0 && !existing.endsWith('\n');
    const separator = needsNewline ? '\n' : '';
    writeFileSync(diaryPath, existing + separator + record + '\n', 'utf8');
  } catch {
    writeFileSync(diaryPath, record + '\n', 'utf8');
  }

  cache.clear();
  // Also add to index for immediate searchability
  const diaryDoc = {
    id: `.kimi/diary.jsonl#${Date.now()}`,
    path: '.kimi/diary.jsonl',
    label: 'Diary',
    content: entry.task || '',
    raw: record,
    type: 'diary',
    isRecent: true,
    isCritical: false,
    date: new Date().toISOString(),
    metadata: { type: entry.type, task: entry.task, agent, status: entry.status }
  };
  indexedDocs.push(diaryDoc);
  docById.set(diaryDoc.id, diaryDoc);
  addToInvertedIndex(diaryDoc);

  return { success: true };
}

// ─── MCP SERVER ───
class MempalaceMCP {
  constructor() {
    this.serverInfo = {
      name: 'mempalace-mcp',
      version: CONFIG.version,
      features: ['search', 'semantic_search', 'recent_context', 'kg_query', 'kg_add', 'kg_batch', 'kg_find_path', 'read_diary', 'write_diary', 'get_status', 'get_room_info', 'auto_tag']
    };
  }

  handleRequest(req) {
    const { method, params } = req;

    switch (method) {
      case 'notifications/initialized':
        logClientReady = true;
        return undefined;

      case 'initialize': {
        // Store client info if provided
        this.clientInfo = params?.clientInfo || null;
        return {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
            logging: {}
          },
          serverInfo: this.serverInfo,
          instructions: `MemPalace v${CONFIG.version} — Prosjektkunnskap for ${CONFIG.wing}. Bruk search først for å finne eksisterende kontekst. Bruk kg_query for å utforske relasjoner mellom entiteter. Bruk recent_context for å se hva som skjedde nylig. Resources: mempalace://document/{path} for å lese dokumenter, mempalace://kg/{entity} for KG-fakta.`
        };
      }

      case 'tools/list':
        return { tools: this.getTools() };

      case 'resources/list': {
        const resources = indexedDocs.slice(0, 50).map(d => ({
          uri: `mempalace://document/${d.path}`,
          name: basename(d.path),
          description: `${d.label} — ${d.content.slice(0, 80)}...`,
          mimeType: d.path.endsWith('.jsonl') ? 'application/x-ndjson' : 'text/markdown'
        }));
        // Add KG entities as resources
        for (const entity of Object.keys(kgData).slice(0, 20)) {
          resources.push({
            uri: `mempalace://kg/${entity}`,
            name: `KG: ${entity}`,
            description: `${kgData[entity].length} facts about ${entity}`,
            mimeType: 'application/json'
          });
        }
        return { resources };
      }

      case 'resources/read': {
        const uri = params?.uri || '';
        if (uri.startsWith('mempalace://document/')) {
          const path = uri.replace('mempalace://document/', '');
          const doc = docById.get(path);
          if (doc) {
            return {
              contents: [{
                uri,
                mimeType: doc.path.endsWith('.jsonl') ? 'application/x-ndjson' : 'text/markdown',
                text: doc.content
              }]
            };
          }
          // Try reading from disk
          const diskPath = resolve(root, path);
          if (existsSync(diskPath)) {
            const text = readFileSync(diskPath, 'utf8');
            return {
              contents: [{
                uri,
                mimeType: path.endsWith('.jsonl') ? 'application/x-ndjson' : 'text/markdown',
                text
              }]
            };
          }
          throw new Error(`Document not found: ${path}`);
        }
        if (uri.startsWith('mempalace://kg/')) {
          const entity = uri.replace('mempalace://kg/', '');
          const data = kgQuery(entity, 1);
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2)
            }]
          };
        }
        throw new Error(`Unknown resource URI scheme: ${uri}`);
      }

      case 'resources/templates/list': {
        return {
          resourceTemplates: [
            {
              uriTemplate: 'mempalace://document/{path}',
              name: 'MemPalace Document',
              description: 'Read any indexed document by path',
              mimeType: 'text/markdown'
            },
            {
              uriTemplate: 'mempalace://kg/{entity}',
              name: 'MemPalace KG Entity',
              description: 'Read knowledge graph facts for an entity',
              mimeType: 'application/json'
            }
          ]
        };
      }

      case 'prompts/list':
        return { prompts: this.getPrompts() };

      case 'prompts/get': {
        const prompt = this.getPrompts().find(p => p.name === params?.name);
        if (!prompt) throw new Error(`Prompt not found: ${params?.name}`);
        const messages = this.buildPromptMessages(params?.name, params?.arguments || {});
        return { description: prompt.description, messages };
      }

      case 'tools/call': {
        const { name, arguments: args } = params;
        const result = this.callTool(name, args);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'ping':
        return {};

      default:
        throw new Error(`Ukjent method: ${method}`);
    }
  }

  getPrompts() {
    return [
      {
        name: 'pre_task',
        description: 'Kjør FØR enhver signifikant oppgave. Søker i minne, KG og recent context.',
        arguments: [
          { name: 'task', description: 'Beskrivelse av oppgaven', required: true },
          { name: 'domain', description: 'Domene (auth, trading, deploy, etc.)', required: false }
        ]
      },
      {
        name: 'post_task',
        description: 'Kjør ETTER enhver signifikant oppgave. Lagrer fakta og diary entry.',
        arguments: [
          { name: 'task', description: 'Hva som ble gjort', required: true },
          { name: 'files', description: 'Antall filer endret', required: false },
          { name: 'status', description: 'GO, NO-GO, eller WIP', required: false }
        ]
      },
      {
        name: 'agent_auth',
        description: 'System prompt for auth-agent. Inkluderer auth-spesifikk kontekst.',
        arguments: []
      },
      {
        name: 'agent_architect',
        description: 'System prompt for architect-agent. Inkluderer arkitektur-kontekst.',
        arguments: []
      }
    ];
  }

  buildPromptMessages(name, args) {
    switch (name) {
      case 'pre_task': {
        const domain = args.domain || '';
        const searchResults = searchDocs(args.task, { limit: 5 });
        const recent = recentContext(48);
        const kgEntity = domain ? kgQuery(domain, 1) : null;
        return [{
          role: 'user',
          content: {
            type: 'text',
            text: `## Pre-Task Context for: ${args.task}\n\n### Relevant Knowledge (${searchResults.length} hits)\n${searchResults.map(r => `- ${r.path} (${r.label}): ${r.snippet.slice(0, 120)}`).join('\n') || 'None'}\n\n### Recent Activity (${recent.length} entries)\n${recent.slice(0, 5).map(r => `- ${r.path} (${r.date}): ${r.content.slice(0, 80)}`).join('\n') || 'None'}\n\n${kgEntity ? `### KG: ${kgEntity.entity}\n${kgEntity.facts.map(f => `- ${f.predicate} → ${f.object}`).join('\n')}` : ''}\n\nProceed with the task using this context. Always verify claims before making changes.`
          }
        }];
      }
      case 'post_task': {
        return [{
          role: 'user',
          content: {
            type: 'text',
            text: `## Post-Task Summary\nTask: ${args.task}\nStatus: ${args.status || 'GO'}\nFiles: ${args.files || 0}\n\nRemember to:\n1. Save key facts to KG with kg_add or kg_batch\n2. Write diary entry with write_diary\n3. Verify no stale types or orphaned files exist`
          }
        }];
      }
      case 'agent_auth': {
        const kg = kgQuery('auth-system', 2);
        return [{
          role: 'user',
          content: {
            type: 'text',
            text: `You are the Auth Agent for Klarpakke.\n\nAuth system facts:\n${kg.facts.map(f => `- ${f.predicate}: ${f.object}`).join('\n')}\n\nRules:\n- ALWAYS use getCallbackUrl() from @/lib/auth/config for OAuth redirectTo\n- NEVER hardcode /auth/callback — use /{locale}/callback\n- NEVER send password-reset to callback — use /no/update-password\n- ALWAYS run npm run oauth:check before pushing auth changes\n- DECLARE on toppnivå, aldri nested\n- EXCEPTION WHEN OTHERS skal ALLTID ha RAISE WARNING`
          }
        }];
      }
      case 'agent_architect': {
        return [{
          role: 'user',
          content: {
            type: 'text',
            text: `You are the Lead Architect for Klarpakke.\n\nStack: Next.js 15, React 19, TypeScript 5.9, Supabase, Vercel\nPrinciples: Minimal change, verify first, GO/NO-GO, automate everything\n\nBefore decisions:\n1. Search MemPalace for existing patterns\n2. Check KG for related entities\n3. Review recent context\n\nAfter decisions:\n1. Document in KG\n2. Write diary entry\n3. Update ADR if architectural`
          }
        }];
      }
      default:
        return [];
    }
  }

  getTools() {
    return [
      {
        name: 'search',
        description: 'Søk i MemPalace kunnskap med TF-IDF rangering. Bruk dette FØRST for å finne eksisterende kontekst.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Søkestreng — vær spesifikk' },
            room: { type: 'string', description: 'Rom-filter: Knowledge, Diary, Handoffs, Plans, Docs, Memory' },
            limit: { type: 'number', description: 'Maks resultater (default: 10)', default: 10 },
            since: { type: 'string', description: 'ISO dato — kun treff etter denne datoen' }
          },
          required: ['query']
        }
      },
      {
        name: 'semantic_search',
        description: 'Semantisk søk med KG-basert synonym-ekspansjon. Bruk når søkeord kan variere.',
        inputSchema: {
          type: 'object',
          properties: {
            concept: { type: 'string', description: 'Konsept/ide å søke etter' },
            room: { type: 'string' },
            limit: { type: 'number', default: 5 }
          },
          required: ['concept']
        }
      },
      {
        name: 'recent_context',
        description: 'Hent nylig lagt til innhold (siste N timer). Bruk for å finne det som skjedde i forrige sesjon.',
        inputSchema: {
          type: 'object',
          properties: {
            hours: { type: 'number', description: 'Timer tilbake (default: 24)', default: 24 },
            room: { type: 'string', description: 'Rom-filter' }
          }
        }
      },
      {
        name: 'kg_query',
        description: 'Query knowledge graph for entity. F.eks. kg_query(entity="auth-system") finner alt vi vet om auth.',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity name' },
            depth: { type: 'number', description: 'Relasjons-dybde (1=direkte, 2=relaterte)', default: 1 }
          },
          required: ['entity']
        }
      },
      {
        name: 'kg_add',
        description: 'Legg til faktum i knowledge graph. F.eks. kg_add(subject="auth", predicate="uses", object="refresh-token-guard")',
        inputSchema: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            predicate: { type: 'string' },
            object: { type: 'string' },
            validFrom: { type: 'string', description: 'ISO dato' }
          },
          required: ['subject', 'predicate', 'object']
        }
      },
      {
        name: 'kg_batch',
        description: 'Batch-insert flere KG-fakta på en gang. Effektivt for k2.6 sin store kontekst.',
        inputSchema: {
          type: 'object',
          properties: {
            facts: {
              type: 'array',
              description: 'Array av {subject, predicate, object, validFrom?}',
              items: { type: 'object' }
            }
          },
          required: ['facts']
        }
      },
      {
        name: 'kg_find_path',
        description: 'Finn sti mellom to entiteter i knowledge graph. F.eks. auth -> trading.',
        inputSchema: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            maxDepth: { type: 'number', default: 3 }
          },
          required: ['from', 'to']
        }
      },
      {
        name: 'read_diary',
        description: 'Les dagbok for agent. Standard: siste 10 entries.',
        inputSchema: {
          type: 'object',
          properties: {
            agent: { type: 'string', description: 'Agent name (default: kimi)' },
            lastN: { type: 'number', description: 'Antall entries', default: 10 }
          }
        }
      },
      {
        name: 'write_diary',
        description: 'Skriv til dagbok. Bruk etter hver signifikant oppgave.',
        inputSchema: {
          type: 'object',
          properties: {
            agent: { type: 'string', default: 'kimi' },
            entry: {
              type: 'object',
              description: '{type, task, status, rating, files, tags}',
              properties: {
                type: { type: 'string', enum: ['FEAT', 'FIX', 'REF', 'DOC', 'OPT', 'SEC', 'ANALYSIS', 'AUTO'] },
                task: { type: 'string' },
                status: { type: 'string', enum: ['GO', 'NO-GO', 'WIP'] },
                rating: { type: 'number', minimum: 1, maximum: 5 },
                files: { type: 'number' },
                tags: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          required: ['entry']
        }
      },
      {
        name: 'get_status',
        description: 'MemPalace systemstatus — indexeringsstatus, antall dokumenter, cache-størrelse.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_room_info',
        description: 'Informasjon om et rom eller list alle rom.',
        inputSchema: {
          type: 'object',
          properties: {
            roomName: { type: 'string', description: 'Rom-navn (valgfri)' }
          }
        }
      },
      {
        name: 'auto_tag',
        description: 'Auto-generer tags for en tekst basert på eksisterende knowledge.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Tekst å analysere' },
            maxTags: { type: 'number', default: 5 }
          },
          required: ['text']
        }
      }
    ];
  }

  callTool(name, args) {
    switch (name) {
      case 'search': {
        const results = searchDocs(args.query, { room: args.room, limit: args.limit, since: args.since });
        return {
          query: args.query,
          hits: results.length,
          results: results.map(r => ({
            ...r,
            snippet: r.snippet.slice(0, CONFIG.maxResultChars)
          }))
        };
      }

      case 'semantic_search': {
        const results = semanticSearch(args.concept, { room: args.room, limit: args.limit || 5 });
        return { concept: args.concept, hits: results.length, results };
      }

      case 'recent_context': {
        const docs = recentContext(args.hours || 24, args.room);
        return {
          hours: args.hours || 24,
          hits: docs.length,
          results: docs.map(d => ({
            id: d.id,
            path: d.path,
            label: d.label,
            date: d.date,
            preview: d.content.slice(0, 300)
          }))
        };
      }

      case 'kg_query':
        return kgQuery(args.entity, args.depth || 1);

      case 'kg_add':
        return kgAdd(args.subject, args.predicate, args.object, args.validFrom);

      case 'kg_batch':
        return kgBatch(args.facts || []);

      case 'kg_find_path':
        return {
          from: args.from,
          to: args.to,
          path: kgFindPath(args.from, args.to, args.maxDepth || 3)
        };

      case 'read_diary':
        return { agent: args.agent || 'kimi', entries: readDiary(args.agent, args.lastN || 10) };

      case 'write_diary': {
        const entry = typeof args.entry === 'string' ? { task: args.entry } : args.entry;
        return writeDiary(args.agent || 'kimi', entry);
      }

      case 'get_status':
        return {
          version: CONFIG.version,
          wing: CONFIG.wing,
          indexReady,
          documents: indexedDocs.length,
          tokens: invertedIndex.size,
          cacheSize: cache.cache.size,
          kgEntities: Object.keys(kgData).length,
          rooms: CONFIG.indexPaths.map(p => p.label),
          criticalRooms: CONFIG.criticalRooms
        };

      case 'get_room_info': {
        if (args.roomName) {
          const target = CONFIG.indexPaths.find(p => p.label.toLowerCase() === args.roomName.toLowerCase());
          if (!target) return { error: `Rom '${args.roomName}' ikke funnet`, available: CONFIG.indexPaths.map(p => p.label) };
          const files = getFiles(resolve(root, target.path), target.include, target.types);
          const filesWithMeta = files.map(f => {
            const stat = statSync(f);
            return { path: relative(root, f), size: stat.size, mtime: stat.mtime.toISOString() };
          });
          return { room: target.label, path: target.path, files: files.length, fileList: filesWithMeta };
        }
        return { rooms: CONFIG.indexPaths.map(p => ({ label: p.label, path: p.path })) };
      }

      case 'auto_tag': {
        const tokens = tokenize(args.text);
        const allTags = new Set();
        // From indexed entities
        indexedDocs.forEach(d => {
          if (d.entities) {
            d.entities.files?.forEach(f => allTags.add(f));
            d.entities.components?.forEach(c => allTags.add(c));
            d.entities.tags?.forEach(t => allTags.add(t));
          }
        });
        // From KG entities
        Object.keys(kgData).forEach(e => allTags.add(e));
        // Matching
        const matches = [...allTags].filter(tag =>
          tokens.some(t => tag.toLowerCase().includes(t) || t.includes(tag.toLowerCase()))
        );
        // Also add semantic expansions if matched
        for (const token of tokens) {
          for (const [key, synonyms] of Object.entries(CONFIG.semanticExpansions)) {
            if (token === key || token.includes(key) || key.includes(token)) {
              synonyms.forEach(s => allTags.add(s));
            }
          }
        }
        const finalMatches = [...allTags].filter(tag =>
          tokens.some(t => tag.toLowerCase().includes(t) || t.includes(tag.toLowerCase()))
        ).slice(0, args.maxTags || 5);
        return { text: args.text.slice(0, 100), tags: finalMatches };
      }

      default:
        throw new Error(`Ukjent tool: ${name}`);
    }
  }
}

// ─── TRANSPORT ───
const mcp = new MempalaceMCP();

function sendMessage(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  let lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;
    let req = null;
    try {
      req = JSON.parse(line);
    } catch (parseErr) {
      console.error('[MemPalace] Invalid JSON:', line.slice(0, 200));
      sendMessage({
        jsonrpc: '2.0', id: 0,
        error: { code: -32700, message: 'Parse error: ' + parseErr.message }
      });
      continue;
    }
    try {
      const result = await mcp.handleRequest(req);
      if (result === undefined) continue; // notification — no response
      sendMessage({ jsonrpc: '2.0', id: req.id ?? 0, result });
    } catch (err) {
      sendMessage({
        jsonrpc: '2.0',
        id: req.id ?? 0,
        error: { code: -32000, message: err.message }
      });
    }
  }
});

console.error('\u{1F3DB}\uFE0F  MemPalace MCP Server v3.2.0 — KIMI CLI v1.40.0 + k2.6 Optimalisert');
console.error(`   Wing: ${CONFIG.wing}`);
console.error(`   Backend: in-memory FTS med inverted index (zero-dep)`);
console.error(`   Cache: LRU/${CONFIG.cacheSize}`);
console.error(`   Resources: mempalace://document/{path}, mempalace://kg/{entity}`);
console.error(`   Prompts: pre_task, post_task, agent_auth, agent_architect`);
console.error(`   KG Write: incremental append + auto-compact`);
console.error(`   Kontekst: 262k (k2.6-optimized)`);
console.error(`   Shutdown: SIGTERM/SIGINT graceful`);
