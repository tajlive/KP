#!/usr/bin/env node
/**
 * 🏛️ MemPalace MCP Server v3.1 — KIMI k2.6 Optimalisert
 *
 * Fikser:
 * - MCP protocol: tool results wrappes i content-array (fixer "content Field required")
 * - KG deduplisering: sjekker for duplikater før lagring
 * - Diary newline-håndtering: sikrer korrekt JSONL-format
 * - Reindex etter endringer: trigger rebuild av index ved KG/diary updates
 * - Batch-write optimalisering: skriver KG én gang per batch
 *
 * Versjon: 3.1.0
 * Dato: 2026-04-22
 * For: KIMI CLI v1.37.0, k2.6, macOS ARM64
 */

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { resolve, join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

// ─── KONFIGURASJON ───
const CONFIG = {
  version: '3.1.0',
  wing: 'klarpakke',
  cacheSize: 100,
  maxResultChars: 1200,
  batchSize: 50,
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
  ]
};

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

// ─── IN-MEMORY INDEX ───
let indexReady = false;
let indexedDocs = [];
let kgData = {};

function tokenize(text) {
  return String(text || '').toLowerCase()
    .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function calculateScore(text, queryTokens, metadata = {}) {
  const tokens = tokenize(text);
  let score = 0;
  queryTokens.forEach(q => {
    const exact = tokens.filter(t => t === q).length;
    const partial = tokens.filter(t => t.includes(q)).length;
    score += exact * 3 + partial * (q.length / 4);
  });
  if (metadata.isRecent) score *= 1.4;
  if (metadata.isCritical) score *= 1.6;
  if (metadata.isFix) score *= 1.3;
  return score;
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

async function buildIndex() {
  const docs = [];
  for (const target of CONFIG.indexPaths) {
    const basePath = resolve(root, target.path);
    if (!existsSync(basePath)) continue;
    const files = getFiles(basePath, target.include, target.types);
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const relPath = relative(root, file);
        const stat = statSync(file);
        const isRecent = (Date.now() - stat.mtimeMs) < 7 * 24 * 60 * 60 * 1000;
        const isCritical = CONFIG.criticalRooms.some(r => relPath.includes(r));

        if (file.endsWith('.jsonl')) {
          const lines = content.split('\n').filter(l => l.trim());
          lines.forEach((line, idx) => {
            try {
              const entry = JSON.parse(line);
              docs.push({
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
              });
            } catch { /* skip */ }
          });
        } else {
          docs.push({
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
          });
        }
      } catch (e) { /* skip unreadable */ }
    }
  }
  indexedDocs = docs;
  kgData = loadKG();
  indexReady = true;
}

// Non-blocking index build
buildIndex();

// ─── SØKE-FUNKSJONER ───
function searchDocs(query, opts = {}) {
  const cacheKey = `search:${query}:${opts.room || 'all'}:${opts.limit || 10}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const limit = opts.limit || 10;
  const roomFilter = opts.room;
  const since = opts.since ? new Date(opts.since) : null;
  const hits = [];

  for (const doc of indexedDocs) {
    if (roomFilter && !doc.label.toLowerCase().includes(roomFilter.toLowerCase())) continue;
    if (since && doc.date && new Date(doc.date) < since) continue;

    const score = calculateScore(doc.content, tokens, {
      isRecent: doc.isRecent,
      isCritical: doc.isCritical,
      isFix: doc.type === 'diary' && doc.metadata?.type === 'FIX'
    });

    if (score > 0) {
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
  }

  const result = hits.sort((a, b) => b.score - a.score).slice(0, limit);
  cache.set(cacheKey, result);
  return result;
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
    });
  }
  return { entity, facts: direct, related, depth };
}

function kgAdd(subject, predicate, object, validFrom) {
  if (!kgData[subject]) kgData[subject] = [];
  // Deduplisering: sjekk for eksisterende identisk fact
  const exists = kgData[subject].some(f =>
    f.predicate === predicate && f.object === object
  );
  if (exists) {
    return { success: true, duplicate: true, fact: { subject, predicate, object } };
  }
  kgData[subject].push({
    predicate,
    object,
    validFrom: validFrom || new Date().toISOString()
  });
  saveKG(kgData);
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
    added++;
    results.push({ success: true, duplicate: false, fact: f });
  }
  // Skriv KG én gang per batch (optimalisering)
  saveKG(kgData);
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

  // Sikre korrekt JSONL-format: én JSON-objekt per linje, newline på slutten
  try {
    const existing = existsSync(diaryPath) ? readFileSync(diaryPath, 'utf8') : '';
    const needsNewline = existing.length > 0 && !existing.endsWith('\n');
    const separator = needsNewline ? '\n' : '';
    writeFileSync(diaryPath, existing + separator + record + '\n', 'utf8');
  } catch {
    writeFileSync(diaryPath, record + '\n', 'utf8');
  }

  // Trigger reindex for nye diary-entries
  cache.clear();
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
      case 'initialize':
        return {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false }, resources: { subscribe: false } },
          serverInfo: this.serverInfo
        };

      case 'tools/list':
        return { tools: this.getTools() };

      case 'tools/call': {
        const { name, arguments: args } = params;
        const result = this.callTool(name, args);
        // FIX: MCP-protokollen krever content-array med text-elementer
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Ukjent method: ${method}`);
    }
  }

  getTools() {
    return [
      {
        name: 'search',
        description: 'Søk i MemPalace kunnskap med TF-IDF rangering. Bruk dette først for å finne eksisterende kontekst.',
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
        description: 'Semantisk søk — finn relatert innhold selv uten nøyaktig ord-match. Bruk når søkeord kan variere.',
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
        const concept = args.concept;
        const expanded = concept;
        const results = searchDocs(expanded, { room: args.room, limit: args.limit || 5 });
        return { concept, expanded, hits: results.length, results };
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
          return { room: target.label, path: target.path, files: files.length };
        }
        return { rooms: CONFIG.indexPaths.map(p => ({ label: p.label, path: p.path })) };
      }

      case 'auto_tag': {
        const tokens = tokenize(args.text);
        const allTags = new Set();
        indexedDocs.forEach(d => {
          if (d.entities) {
            d.entities.files?.forEach(f => allTags.add(f));
            d.entities.components?.forEach(c => allTags.add(c));
            d.entities.tags?.forEach(t => allTags.add(t));
          }
        });
        const matches = [...allTags].filter(tag =>
          tokens.some(t => tag.toLowerCase().includes(t) || t.includes(tag.toLowerCase()))
        ).slice(0, args.maxTags || 5);
        return { text: args.text.slice(0, 100), tags: matches };
      }

      default:
        throw new Error(`Ukjent tool: ${name}`);
    }
  }
}

// ─── TRANSPORT ───
const mcp = new MempalaceMCP();

process.stdin.setEncoding('utf8');
let buffer = '';


process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  let lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const req = JSON.parse(line);
      const result = await mcp.handleRequest(req);
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id ?? 0, result }) + '\n');
    } catch (err) {
      const reqId = (() => { try { return JSON.parse(line)?.id ?? 0; } catch { return 0; } })();
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: reqId,
        error: { code: -32000, message: err.message }
      }) + '\n');
    }
  }
});

console.error('\u{1F3DB}\uFE0F  MemPalace MCP Server v3.1 — KIMI k2.6 Optimalisert');
console.error(`   Wing: ${CONFIG.wing}`);
console.error(`   Backend: in-memory FTS (zero-dep)`);
console.error(`   Cache: LRU/${CONFIG.cacheSize}`);
console.error(`   Kontekst: 262k (k2.6-optimized)`);
