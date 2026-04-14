#!/usr/bin/env node
/**
 * 🏛️ Mempalace MCP Server — FTS5-optimized
 *
 * Integrerer Mempalace minnesystem med MCP for:
 * - Søk i prosjektkunnskap (via mempalace CLI / SQLite FTS5)
 * - Knowledge graph spørringer
 * - Diary entries
 * - Kontekst-aware assistanse
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

// Load mempalace config
function loadConfig() {
  const configPath = resolve(root, 'mempalace.yaml');
  if (!existsSync(configPath)) {
    return {
      wing: 'klarpakke',
      storage: { mode: 'raw', search_backend: 'sqlite-fts5' },
      rooms: []
    };
  }

  // Simple YAML parsing
  const content = readFileSync(configPath, 'utf8');
  const config = { rooms: [] };
  let currentRoom = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.startsWith('wing:')) {
      config.wing = trimmed.split(':')[1].trim();
    } else if (trimmed.startsWith('mode:')) {
      config.storage = config.storage || {};
      config.storage.mode = trimmed.split(':')[1].trim();
    } else if (trimmed.startsWith('search_backend:')) {
      config.storage = config.storage || {};
      config.storage.search_backend = trimmed.split(':')[1].trim();
    } else if (trimmed.startsWith('aaak_compression:')) {
      config.storage = config.storage || {};
      config.storage.aaak_compression = trimmed.split(':')[1].trim() === 'true';
    } else if (trimmed === 'rooms:') {
      // Start of rooms section
    } else if (trimmed.startsWith('- name:')) {
      currentRoom = { name: trimmed.split(':')[1].trim() };
      config.rooms.push(currentRoom);
    } else if (currentRoom && trimmed.startsWith('description:')) {
      currentRoom.description = trimmed.split(':')[1].trim();
    } else if (currentRoom && trimmed.startsWith('priority:')) {
      currentRoom.priority = trimmed.split(':')[1].trim();
    }
  }

  return config;
}

// Search drawers using mempalace CLI (SQLite FTS5)
function searchDrawers(query, wing) {
  try {
    const result = execSync(
      `mempalace search ${JSON.stringify(query)} --wing ${wing || 'klarpakke'}`,
      { encoding: 'utf8', cwd: root }
    );

    const lines = result.split('\n');
    const drawers = [];
    let current = null;
    let inContent = false;
    let sawMetadata = false;

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      // New result entry
      const entryMatch = line.match(/^\s*\[(\d+)\]\s+(\S+)\s+\/\s+(\S+)/);
      if (entryMatch) {
        if (current) drawers.push(current);
        current = {
          rank: parseInt(entryMatch[1], 10),
          wing: entryMatch[2],
          room: entryMatch[3],
          source: '',
          match: 0,
          content: ''
        };
        inContent = false;
        sawMetadata = false;
        continue;
      }

      if (!current) continue;

      const sourceMatch = line.match(/^\s*Source:\s*(.*)/);
      if (sourceMatch) {
        current.source = sourceMatch[1].trim();
        sawMetadata = true;
        continue;
      }

      const matchMatch = line.match(/^\s*Match:\s*([\d.\-]+)/);
      if (matchMatch) {
        current.match = parseFloat(matchMatch[1]);
        sawMetadata = true;
        continue;
      }

      // Start of content block (first empty line after metadata)
      if (line === '' && sawMetadata && !inContent) {
        inContent = true;
        continue;
      }

      // Separator between results
      if (line.startsWith('───')) {
        inContent = false;
        sawMetadata = false;
        continue;
      }

      if (inContent) {
        current.content += line + '\n';
      }
    }

    if (current) drawers.push(current);

    // Trim trailing newlines and slice content for MCP transport
    return drawers.map(d => ({
      wing: d.wing,
      room: d.room,
      source: d.source,
      match: d.match,
      content: d.content.trim().slice(0, 800)
    }));
  } catch {
    return [];
  }
}

// Knowledge Graph operations
function kgQuery(entity) {
  const kgPath = resolve(root, '.mempalace/kg.json');
  if (!existsSync(kgPath)) return null;

  try {
    const kg = JSON.parse(readFileSync(kgPath, 'utf8'));
    return kg[entity] || null;
  } catch {
    return null;
  }
}

// Diary operations
function readDiary(agent, lastN = 10) {
  const diaryPath = resolve(root, `.mempalace/diary/${agent}.jsonl`);
  if (!existsSync(diaryPath)) return [];

  try {
    const lines = readFileSync(diaryPath, 'utf8').split('\n').filter(Boolean);
    return lines.slice(-lastN).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

function writeDiary(agent, entry) {
  const diaryDir = resolve(root, '.mempalace/diary');
  if (!existsSync(diaryDir)) {
    execSync(`mkdir -p "${diaryDir}"`);
  }

  const diaryPath = resolve(diaryDir, `${agent}.jsonl`);
  const record = JSON.stringify({
    ts: new Date().toISOString(),
    entry
  });

  try {
    execSync(`echo ${JSON.stringify(record)} >> "${diaryPath}"`);
    return { success: true };
  } catch {
    return { success: false };
  }
}

class MempalaceMCP {
  constructor() {
    this.config = loadConfig();
    this.serverInfo = {
      name: 'mempalace-mcp',
      version: '2.1-fts5',
      features: ['search', 'kg_get', 'kg_add', 'read_diary', 'write_diary', 'get_status', 'find_tunnels']
    };
  }

  // ===== TOOLS =====

  async search(query, wing, limit = 5) {
    const results = searchDrawers(query, wing || this.config.wing);
    return results.slice(0, limit);
  }

  async getRoomInfo(roomName) {
    const room = this.config.rooms.find(r => r.name === roomName);
    if (!room) {
      // List all rooms
      return {
        wing: this.config.wing,
        rooms: this.config.rooms.map(r => ({
          name: r.name,
          description: r.description,
          priority: r.priority
        }))
      };
    }
    return room;
  }

  kgGet(entity) {
    return {
      entity,
      facts: kgQuery(entity),
      note: 'Knowledge graph queried from local storage'
    };
  }

  kgAdd(subject, predicate, object, validFrom) {
    const kgPath = resolve(root, '.mempalace/kg.json');
    let kg = {};

    try {
      if (existsSync(kgPath)) {
        kg = JSON.parse(readFileSync(kgPath, 'utf8'));
      }
    } catch {
      kg = {};
    }

    if (!kg[subject]) kg[subject] = [];
    kg[subject].push({ predicate, object, validFrom: validFrom || new Date().toISOString() });

    try {
      execSync(`mkdir -p "${resolve(root, '.mempalace')}"`);
      execSync(`echo ${JSON.stringify(JSON.stringify(kg))} > "${kgPath}"`);
    } catch {
      // ignore write errors
    }

    return {
      success: true,
      fact: { subject, predicate, object, validFrom }
    };
  }

  readDiary(agent, lastN) {
    return {
      agent,
      entries: readDiary(agent, lastN)
    };
  }

  writeDiary(agent, entry) {
    return writeDiary(agent, entry);
  }

  getStatus() {
    let drawerCount = 0;
    try {
      const result = execSync('mempalace status 2>&1', { encoding: 'utf8', cwd: root });
      const match = result.match(/(\d+)\s+drawers/);
      if (match) drawerCount = parseInt(match[1], 10);
    } catch {}

    return {
      wing: this.config.wing,
      mode: this.config.storage?.mode || 'raw',
      rooms: this.config.rooms.length,
      drawers: drawerCount,
      searchBackend: this.config.storage?.search_backend || 'sqlite-fts5',
      aaakCompression: this.config.storage?.aaak_compression || false
    };
  }

  async findTunnels(wingA, wingB) {
    // Find rooms that bridge two wings
    return {
      note: 'Tunnel search requires full Mempalace server',
      wingA,
      wingB,
      available: this.config.rooms.map(r => r.name)
    };
  }

  // ===== MCP PROTOCOL =====

  handleRequest(req) {
    const { method, params } = req;

    switch (method) {
      case 'initialize':
        return { serverInfo: this.serverInfo };

      case 'tools/list':
        return {
          tools: [
            {
              name: 'search',
              description: 'Søk i Mempalace kunnskap (SQLite FTS5)',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Søkestreng' },
                  wing: { type: 'string', description: 'Wing å søke i (default: klarpakke)' },
                  limit: { type: 'number', description: 'Maks resultater', default: 5 }
                },
                required: ['query']
              }
            },
            {
              name: 'get_room_info',
              description: 'Hent informasjon om et rom eller list alle rom',
              inputSchema: {
                type: 'object',
                properties: {
                  roomName: { type: 'string', description: 'Rom-navn (valgfri)' }
                }
              }
            },
            {
              name: 'kg_get',
              description: 'Query knowledge graph for entity',
              inputSchema: {
                type: 'object',
                properties: {
                  entity: { type: 'string', description: 'Entity name' }
                },
                required: ['entity']
              }
            },
            {
              name: 'kg_add',
              description: 'Add fact to knowledge graph',
              inputSchema: {
                type: 'object',
                properties: {
                  subject: { type: 'string' },
                  predicate: { type: 'string' },
                  object: { type: 'string' },
                  validFrom: { type: 'string', description: 'ISO date' }
                },
                required: ['subject', 'predicate', 'object']
              }
            },
            {
              name: 'read_diary',
              description: 'Read agent diary entries',
              inputSchema: {
                type: 'object',
                properties: {
                  agent: { type: 'string', description: 'Agent name' },
                  lastN: { type: 'number', description: 'Number of entries', default: 10 }
                },
                required: ['agent']
              }
            },
            {
              name: 'write_diary',
              description: 'Write entry to agent diary',
              inputSchema: {
                type: 'object',
                properties: {
                  agent: { type: 'string' },
                  entry: { type: 'string', description: 'Entry in AAAK format' }
                },
                required: ['agent', 'entry']
              }
            },
            {
              name: 'get_status',
              description: 'Get Mempalace system status',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'find_tunnels',
              description: 'Find rooms that bridge wings',
              inputSchema: {
                type: 'object',
                properties: {
                  wingA: { type: 'string' },
                  wingB: { type: 'string' }
                }
              }
            }
          ]
        };

      case 'tools/call': {
        const { name, arguments: args } = params;

        switch (name) {
          case 'search':
            return this.search(args.query, args.wing, args.limit);
          case 'get_room_info':
            return this.getRoomInfo(args.roomName);
          case 'kg_get':
            return this.kgGet(args.entity);
          case 'kg_add':
            return this.kgAdd(args.subject, args.predicate, args.object, args.validFrom);
          case 'read_diary':
            return this.readDiary(args.agent, args.lastN);
          case 'write_diary':
            return this.writeDiary(args.agent, args.entry);
          case 'get_status':
            return this.getStatus();
          case 'find_tunnels':
            return this.findTunnels(args.wingA, args.wingB);
          default:
            throw new Error(`Ukjent tool: ${name}`);
        }
      }

      default:
        throw new Error(`Ukjent method: ${method}`);
    }
  }
}

// Stdio transport for MCP
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
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\n');
    } catch (err) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32000, message: err.message }
      }) + '\n');
    }
  }
});

console.error('🏛️  Mempalace MCP Server started (FTS5)');
console.error(`   Wing: ${mcp.config.wing}`);
console.error(`   Backend: ${mcp.config.storage?.search_backend || 'sqlite-fts5'}`);
console.error(`   Rooms: ${mcp.config.rooms.length}`);
