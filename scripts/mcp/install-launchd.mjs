#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, execFileSync } from 'child_process';
import { homedir } from 'os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LABEL = 'no.klarpakke.mcp-bridge';
const PLIST = resolve(homedir(), 'Library/LaunchAgents', LABEL + '.plist');
const BRIDGE = resolve(ROOT, 'scripts/mcp/dist/kimi-bridge.js');
const LOGS = resolve(ROOT, 'logs');

const env = readFileSync(resolve(ROOT, '.env.local'), 'utf-8');
const m = env.match(/^MCP_API_KEY=(.+)$/m);
if (!m) { console.error('MCP_API_KEY ikke i .env.local'); process.exit(1); }
const KEY = m[1].trim().replace(/^"|"$/g, '');
const NODE = execSync('which node', { encoding: 'utf-8' }).trim();

mkdirSync(LOGS, { recursive: true });
mkdirSync(dirname(PLIST), { recursive: true });

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
  '<plist version="1.0"><dict>',
  '  <key>Label</key><string>' + LABEL + '</string>',
  '  <key>ProgramArguments</key>',
  '  <array><string>' + NODE + '</string><string>' + BRIDGE + '</string></array>',
  '  <key>EnvironmentVariables</key><dict>',
  '    <key>TRANSPORT</key><string>http</string>',
  '    <key>PORT</key><string>3100</string>',
  '    <key>MCP_API_KEY</key><string>' + KEY + '</string>',
  '    <key>REPO_ROOT</key><string>' + ROOT + '</string>',
  '    <key>FORCE_COLOR</key><string>0</string>',
  '    <key>CI</key><string>true</string>',
  '  </dict>',
  '  <key>WorkingDirectory</key><string>' + ROOT + '</string>',
  '  <key>RunAtLoad</key><true/>',
  '  <key>KeepAlive</key><true/>',
  '  <key>StandardOutPath</key><string>' + LOGS + '/mcp-bridge-stdout.log</string>',
  '  <key>StandardErrorPath</key><string>' + LOGS + '/mcp-bridge-stderr.log</string>',
  '</dict></plist>'
].join('\n');

writeFileSync(PLIST, xml, 'utf-8');
console.log('✅ Plist:', PLIST);
try { execFileSync('launchctl', ['unload', PLIST], { stdio: 'ignore' }); } catch {}
execFileSync('launchctl', ['load', PLIST]);
console.log('✅ Agent lastet:', LABEL);
await new Promise(r => setTimeout(r, 2000));
try {
  const h = execSync('curl -sf http://localhost:3100/health', { encoding: 'utf-8', timeout: 5000 });
  console.log('✅ Health OK:', h.trim());
} catch { console.warn('⚠️  Health ikke svart enda — prøv: curl http://localhost:3100/health'); }
try {
  const l = execSync('launchctl list | grep klarpakke', { encoding: 'utf-8' }).trim();
  console.log('✅ Agent aktiv:', l);
} catch { console.warn('⚠️  Ikke i launchctl list enda'); }
console.log('\n🚀 Bridge kjører på http://localhost:3100 — starter automatisk ved innlogging.');
