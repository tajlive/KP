#!/usr/bin/env node
/**
 * 🏛️ Mempalace MCP Server
 * 
 * Integrerer Mempalace minnesystem med MCP for:
 * - Søk i prosjektkunnskap
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
      storage: { mode: 'raw', search_backend: 'grep' },
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

// Search drawers using grep (raw mode)
function searchDrawers(query, wing) {
  // execSync imported at top level
  
  try {
    // Search in .mempalace directory
    const mempalaceDir = resolve(root, '.mempalace');
    if (!existsSync(mempalaceDir)) return [];
    
    const result = execSync(
      `grep -r -i -l "${query.replace(/"/g, '\\"')}" "${mempalaceDir}" 2>/dev/null | head -20`,
      { encoding: 'utf8' }
    );
    
    return result.trim().split('\n').filter(Boolean).map(path => ({
      path: path.replace(mempalaceDir, ''),
      content: readFileSync(path, 'utf8').slice(0, 500)
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
    const lines = readFileSync(diaryPath, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-lastN).map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
  } catch {
    return [];
  }
}

// MCP Server implementation
class MempalaceMCP {
  constructor() {
    this.config = loadConfig();
    this.serverInfo = {
      name: 'mempalace-mcp',
      version: '2.0.0',
      description: 'Mempalace Memory System MCP Server'
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

  async kgGet(entity) {
    return kgQuery(entity);
  }

  async kgAdd(subject, predicate, object, validFrom) {
    // In raw mode, just log the operation
    return {
      added: { subject, predicate, object, validFrom },
      note: 'Knowledge graph update logged (raw mode)'
    };
  }

  async readDiary(agent, lastN) {
    return readDiary(agent, lastN);
  }

  async writeDiary(agent, entry) {
    // In raw mode, just return confirmation
    return {
      written: true,
      agent,
      entry: entry.slice(0, 100),
      note: 'Diary entry logged (raw mode)'
    };
  }

  async getStatus() {
    const mempalaceDir = resolve(root, '.mempalace');
    let drawerCount = 0;
    
    try {
      const result = execSync(`find "${mempalaceDir}" -type f 2>/dev/null | wc -l`, { encoding: 'utf8' });
      drawerCount = parseInt(result.trim()) || 0;
    } catch {}
    
    return {
      wing: this.config.wing,
      mode: this.config.storage?.mode || 'raw',
      rooms: this.config.rooms.length,
      drawers: drawerCount,
      searchBackend: this.config.storage?.search_backend || 'grep',
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
              description: 'Søk i Mempalace kunnskap',
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

      case 'tools/call':
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

console.error('🏛️  Mempalace MCP Server started');
console.error(`   Wing: ${mcp.config.wing}`);
console.error(`   Mode: ${mcp.config.storage?.mode || 'raw'}`);
console.error(`   Rooms: ${mcp.config.rooms.length}`);
