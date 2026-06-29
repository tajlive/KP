#!/usr/bin/env node
/**
 * MemPalace MCP Server v3.5.0 — Klarpakke wrapper
 * Delegater til delt server i ~/.kimi/mempalace-server.mjs
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const server = spawn('node', ['/Users/taj/.kimi/mempalace-server.mjs'], {
  stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  env: {
    ...process.env,
    MEMPALACE_ROOT: root,
    MEMPALACE_CONFIG: resolve(root, '.mempalace/config.json')
  }
});

process.on('SIGTERM', () => server.kill('SIGTERM'));
process.on('SIGINT', () => server.kill('SIGINT'));
server.on('exit', (code) => process.exit(code ?? 0));
