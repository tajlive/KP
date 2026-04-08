#!/usr/bin/env node
/**
 * 🚀 Start Mempalace MCP System
 * 
 * Starter hele Mempalace-MCP økosystemet for KIMI.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';

const CONFIG = {
  serverPort: 3456,
  indexOnStart: true,
  watchMode: true
};

console.log('🏛️  Starting Mempalace MCP System...\n');

// Sjekk avhengigheter
if (!existsSync('node_modules/glob')) {
  console.log('📦 Installing dependencies...');
  spawn('npm', ['install', 'glob'], { stdio: 'inherit' });
}

// Start MCP Server
console.log('🔌 Starting MCP Server on port', CONFIG.serverPort);
const server = spawn('node', ['scripts/mempalace-mcp-server.mjs'], {
  stdio: 'inherit',
  detached: false
});

// Vent på at server starter
setTimeout(() => {
  console.log('\n✅ Mempalace MCP Ready!');
  console.log('\nKIMI can now use:');
  console.log('  @auth     - Auth system context');
  console.log('  @trading  - Trading system context');
  console.log('  @db       - Database context');
  console.log('  @test     - Testing context');
  console.log('\nOr query any symbol:');
  console.log('  curl http://localhost:3456/index?symbol=Trade');
  console.log('  curl http://localhost:3456/context?q=executeTrade');
  console.log('\nPress Ctrl+C to stop');
}, 3000);

// Håndter shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down Mempalace MCP...');
  server.kill();
  process.exit(0);
});
