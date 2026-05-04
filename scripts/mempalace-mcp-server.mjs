#!/usr/bin/env node
/**
 * ⚠️  DEPRECATED — Bruk scripts/run-mempalace-mcp-v2.mjs (MemPalace MCP v3.2.0)
 * Denne filen beholdes for historikk. Den bruker HTTP-transport (port 3456)
 * som ikke er kompatibel med KIMI CLI sin stdio-baserte MCP.
 *
 * 🏛️ Mempalace MCP Server
 *
 * Kontekst-server for KIMI som gir supermenneskelig prosjektforståelse.
 * Kjører som MCP (Model Context Protocol) server.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { createServer } from 'http';
import { globSync } from 'glob';

const CONFIG = JSON.parse(readFileSync('.mcp/mempalace-mcp.json', 'utf8'));
const PORT = process.env.MEMPALACE_PORT || 3456;

// In-memory cache
const cache = new Map();
const index = new Map();

class MempalaceMCP {
  constructor() {
    this.currentRoom = null;
    this.sessionContext = {
      recentFiles: [],
      recentSearches: [],
      activeDomain: null
    };
    this.buildIndex();
  }

  buildIndex() {
    console.log('🏛️  Building Mempalace index...');
    
    // Index all TypeScript/JavaScript files
    const files = globSync('src/**/*.{ts,tsx}', { ignore: ['node_modules/**'] });
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const stats = statSync(file);
        
        // Extract exports
        const exports = this.extractExports(content);
        const imports = this.extractImports(content);
        const types = this.extractTypes(content);
        
        index.set(file, {
          exports,
          imports,
          types,
          lastModified: stats.mtime,
          size: stats.size
        });
        
        // Reverse index for types
        for (const type of types) {
          if (!index.has(`type:${type}`)) {
            index.set(`type:${type}`, []);
          }
          index.get(`type:${type}`).push(file);
        }
      } catch (e) {
        // Skip unreadable files
      }
    }
    
    console.log(`✅ Indexed ${index.size} entries`);
  }

  extractExports(content) {
    const exports = [];
    const patterns = [
      /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g,
      /export\s+\{\s*([^}]+)\}/g,
      /export\s+default\s+(\w+)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }
    return exports;
  }

  extractImports(content) {
    const imports = [];
    const pattern = /from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  extractTypes(content) {
    const types = [];
    const patterns = [
      /interface\s+(\w+)/g,
      /type\s+(\w+)\s*=/g,
      /export\s+class\s+(\w+)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        types.push(match[1]);
      }
    }
    return types;
  }

  resolveShortcut(shortcut) {
    const cfg = CONFIG.shortcuts[shortcut];
    if (!cfg) return null;
    
    const context = {
      description: cfg.description,
      files: [],
      docs: []
    };
    
    // Resolve glob patterns
    for (const pattern of cfg.files) {
      if (pattern.includes('*')) {
        context.files.push(...globSync(pattern));
      } else if (existsSync(pattern)) {
        context.files.push(pattern);
      }
    }
    
    for (const doc of cfg.docs || []) {
      if (existsSync(doc)) context.docs.push(doc);
    }
    
    return context;
  }

  findDefinition(symbol) {
    // Check type index
    const typeFiles = index.get(`type:${symbol}`);
    if (typeFiles) {
      return typeFiles.map(f => ({
        file: f,
        exports: index.get(f).exports,
        confidence: 'high'
      }));
    }
    
    // Search in exports
    const results = [];
    for (const [file, data] of index) {
      if (file.startsWith('type:')) continue;
      if (data.exports.includes(symbol)) {
        results.push({
          file,
          exports: data.exports,
          confidence: 'high'
        });
      }
    }
    
    return results;
  }

  predictIssues(files) {
    const issues = [];
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        
        // Check for anti-patterns
        if (content.includes('as any')) {
          issues.push({
            file,
            type: 'typescript',
            severity: 'warning',
            message: 'Uses "as any" - consider proper typing',
            line: content.split('\n').findIndex(l => l.includes('as any')) + 1
          });
        }
        
        if (content.includes('as unknown')) {
          issues.push({
            file,
            type: 'typescript',
            severity: 'info',
            message: 'Uses "as unknown" - may indicate type debt',
            line: content.split('\n').findIndex(l => l.includes('as unknown')) + 1
          });
        }
        
        // Check for missing tests
        if (content.includes('export function') || content.includes('export class')) {
          const testFile = file.replace(/\.(ts|tsx)$/, '.test.$1');
          if (!existsSync(testFile) && !existsSync(testFile.replace('.test.', '.spec.'))) {
            issues.push({
              file,
              type: 'testing',
              severity: 'info',
              message: 'Exported code without test file'
            });
          }
        }
      } catch (e) {}
    }
    
    return issues;
  }

  getContextForQuery(query) {
    const context = {
      domains: [],
      files: [],
      types: [],
      suggestions: []
    };
    
    // Check for shortcuts
    if (query.startsWith('@')) {
      const shortcut = this.resolveShortcut(query);
      if (shortcut) {
        return {
          type: 'shortcut',
          ...shortcut
        };
      }
    }
    
    // Search for symbol
    const definitions = this.findDefinition(query);
    if (definitions.length > 0) {
      context.definitions = definitions;
    }
    
    // Detect domain
    if (query.match(/trade|order|session/i)) {
      context.domains.push('trading');
    }
    if (query.match(/auth|login|user/i)) {
      context.domains.push('auth');
    }
    if (query.match(/db|supabase|migration/i)) {
      context.domains.push('database');
    }
    
    return context;
  }

  handleRequest(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;
    
    try {
      switch (path) {
        case '/context': {
          const query = url.searchParams.get('q');
          const context = this.getContextForQuery(query);
          res.end(JSON.stringify(context, null, 2));
          break;
        }
        
        case '/index': {
          const symbol = url.searchParams.get('symbol');
          const definitions = this.findDefinition(symbol);
          res.end(JSON.stringify(definitions, null, 2));
          break;
        }
        
        case '/predict': {
          const files = url.searchParams.get('files')?.split(',') || [];
          const issues = this.predictIssues(files);
          res.end(JSON.stringify(issues, null, 2));
          break;
        }
        
        case '/status': {
          res.end(JSON.stringify({
            status: 'ok',
            indexedFiles: index.size,
            currentRoom: this.currentRoom,
            session: this.sessionContext
          }));
          break;
        }
        
        default:
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: e.message }));
    }
  }

  start() {
    const server = createServer((req, res) => this.handleRequest(req, res));
    server.listen(PORT, () => {
      console.log(`🏛️  Mempalace MCP Server running on port ${PORT}`);
      console.log(`   Endpoints:`);
      console.log(`   - GET /context?q=<query>    - Get context for query`);
      console.log(`   - GET /index?symbol=<name>  - Find symbol definition`);
      console.log(`   - GET /predict?files=a,b    - Predict issues in files`);
      console.log(`   - GET /status               - Server status`);
    });
  }
}

// Start server
const mcp = new MempalaceMCP();
mcp.start();
