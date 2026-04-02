#!/usr/bin/env node
/**
 * Scroll Debug Report Generator
 * Creates a detailed HTML report of all potential scroll issues
 */

import { glob } from 'glob';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, relative } from 'path';

const SRC_DIR = resolve(process.cwd(), 'src');
const REPORT_PATH = resolve(process.cwd(), 'reports/scroll-debug-report.html');

const findings = [];

function addFinding(file, line, type, severity, message, code, fix) {
  findings.push({ file, line, type, severity, message, code: code || '', fix });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function findLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

function extractContext(content, index, radius = 100) {
  const start = Math.max(0, index - radius);
  const end = Math.min(content.length, index + radius);
  return content.substring(start, end).replace(/\s+/g, ' ').trim();
}

async function analyzeFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const relativePath = relative(process.cwd(), filePath);
  
  // 1. Check for overflow patterns
  const overflowPattern = /overflow-(x|y)-(auto|hidden|scroll)/g;
  let match;
  while ((match = overflowPattern.exec(content)) !== null) {
    const line = findLineNumber(content, match.index);
    const context = extractContext(content, match.index);
    addFinding(
      relativePath,
      line,
      'overflow',
      match[2] === 'hidden' ? 'warning' : 'info',
      `Found overflow-${match[1]}-${match[2]}`,
      escapeHtml(context),
      match[2] === 'hidden' ? 'Verify this does not block scroll' : 'OK if used correctly'
    );
  }
  
  // 2. Check for h-screen patterns
  const hScreenPattern = /h-screen|h-dvh|h-full/g;
  while ((match = hScreenPattern.exec(content)) !== null) {
    const line = findLineNumber(content, match.index);
    const context = extractContext(content, match.index);
    
    // Check if combined with overflow-hidden
    const nearby = content.substring(Math.max(0, match.index - 200), match.index + 200);
    const hasOverflowHidden = nearby.includes('overflow-hidden');
    
    addFinding(
      relativePath,
      line,
      'height',
      hasOverflowHidden ? 'critical' : 'info',
      `Found ${match[0]}${hasOverflowHidden ? ' with overflow-hidden' : ''}`,
      escapeHtml(context),
      hasOverflowHidden ? 'CRITICAL: This blocks scroll' : 'OK if content fits'
    );
  }
  
  // 3. Check for flex + overflow combinations
  const flexPattern = /className="[^"]*flex[^"]*overflow|className="[^"]*overflow[^"]*flex/g;
  while ((match = flexPattern.exec(content)) !== null) {
    const line = findLineNumber(content, match.index);
    const context = extractContext(content, match.index);
    addFinding(
      relativePath,
      line,
      'flex',
      'info',
      'Flex + overflow combination detected',
      escapeHtml(context),
      'Verify scroll behavior works correctly'
    );
  }
  
  // 4. Check for fixed/sticky positioning
  const fixedPattern = /fixed|sticky/g;
  while ((match = fixedPattern.exec(content)) !== null) {
    const line = findLineNumber(content, match.index);
    const context = extractContext(content, match.index);
    addFinding(
      relativePath,
      line,
      'position',
      'info',
      `Found ${match[0]} positioning`,
      escapeHtml(context),
      'May affect scroll, verify z-index'
    );
  }
  
  // 5. Check for pointer-events-none
  const pointerPattern = /pointer-events-none/g;
  while ((match = pointerPattern.exec(content)) !== null) {
    const line = findLineNumber(content, match.index);
    const context = extractContext(content, match.index);
    
    // Check if near z-index
    const nearby = content.substring(Math.max(0, match.index - 100), match.index + 100);
    const hasZIndex = nearby.includes('z-') || nearby.includes('z-[');
    
    addFinding(
      relativePath,
      line,
      'pointer-events',
      hasZIndex ? 'warning' : 'info',
      `pointer-events-none${hasZIndex ? ' with z-index' : ''}`,
      escapeHtml(context),
      hasZIndex ? 'High z-index + pointer-events-none may block interactions' : 'OK for decorative elements'
    );
  }
  
  // 6. Check for min-h-0 with flex
  const minHPattern = /min-h-0/g;
  while ((match = minHPattern.exec(content)) !== null) {
    const line = findLineNumber(content, match.index);
    const context = extractContext(content, match.index);
    addFinding(
      relativePath,
      line,
      'flex',
      'warning',
      'min-h-0 in flex container',
      escapeHtml(context),
      'May need overflow-y-auto to enable scroll'
    );
  }
  
  // 7. Check for nested scroll containers
  const containers = [...content.matchAll(/overflow-y-auto/g)];
  if (containers.length > 1) {
    const line = findLineNumber(content, containers[1].index);
    addFinding(
      relativePath,
      line,
      'scroll',
      'critical',
      `NESTED SCROLL: ${containers.length} overflow-y-auto containers found`,
      'Multiple scroll containers in same file',
      'Remove nested overflow, only outer container should scroll'
    );
  }
}

function generateReport() {
  const critical = findings.filter(f => f.severity === 'critical');
  const warnings = findings.filter(f => f.severity === 'warning');
  const infos = findings.filter(f => f.severity === 'info');
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scroll Debug Report - Klarpakke</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0; 
      padding: 20px; 
      background: #0f172a;
      color: #e2e8f0;
    }
    h1 { color: #fff; margin-bottom: 10px; }
    .summary { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: #1e293b;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-card.critical { border-left: 4px solid #ef4444; }
    .stat-card.warning { border-left: 4px solid #f59e0b; }
    .stat-card.info { border-left: 4px solid #3b82f6; }
    .stat-number { font-size: 32px; font-weight: bold; }
    .stat-label { color: #94a3b8; font-size: 14px; }
    .finding {
      background: #1e293b;
      margin: 10px 0;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid;
    }
    .finding.critical { border-left-color: #ef4444; }
    .finding.warning { border-left-color: #f59e0b; }
    .finding.info { border-left-color: #3b82f6; }
    .file-path { color: #60a5fa; font-family: monospace; font-size: 13px; }
    .message { margin: 8px 0; font-weight: 500; }
    .code {
      background: #0f172a;
      padding: 10px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      color: #94a3b8;
      overflow-x: auto;
      margin: 10px 0;
    }
    .fix {
      background: #064e3b;
      color: #6ee7b7;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
    }
    .section { margin: 30px 0; }
    .section h2 { color: #fff; margin-bottom: 15px; }
    .success { color: #10b981; }
    .scroll-test {
      background: #1e293b;
      padding: 20px;
      border-radius: 12px;
      margin: 20px 0;
    }
    .scroll-container {
      height: 200px;
      overflow-y: auto;
      border: 2px solid #334155;
      padding: 10px;
      margin: 10px 0;
    }
    .scroll-content {
      height: 500px;
      background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
  </style>
</head>
<body>
  <h1>🔍 Scroll Debug Report</h1>
  <p>Generated: ${new Date().toLocaleString('no-NO')}</p>
  
  <div class="summary">
    <div class="stat-card critical">
      <div class="stat-number">${critical.length}</div>
      <div class="stat-label">Critical Issues</div>
    </div>
    <div class="stat-card warning">
      <div class="stat-number">${warnings.length}</div>
      <div class="stat-label">Warnings</div>
    </div>
    <div class="stat-card info">
      <div class="stat-number">${infos.length}</div>
      <div class="stat-label">Info Items</div>
    </div>
    <div class="stat-card" style="border-left-color: #10b981;">
      <div class="stat-number">${findings.length}</div>
      <div class="stat-label">Total Findings</div>
    </div>
  </div>

  <div class="scroll-test">
    <h3>Test: Does this scroll container work?</h3>
    <p>If you can scroll this box, your browser supports overflow scrolling:</p>
    <div class="scroll-container">
      <div class="scroll-content">Scroll me!</div>
    </div>
  </div>

  ${critical.length > 0 ? `
  <div class="section">
    <h2>🚨 Critical Issues (Must Fix)</h2>
    ${critical.map(f => `
    <div class="finding critical">
      <div class="file-path">${f.file}:${f.line}</div>
      <div class="message">${f.message}</div>
      <div class="code">${f.code}</div>
      <div class="fix">Fix: ${f.fix}</div>
    </div>
    `).join('')}
  </div>
  ` : '<div class="section"><h2 class="success">✅ No Critical Issues Found!</h2></div>'}

  ${warnings.length > 0 ? `
  <div class="section">
    <h2>⚠️ Warnings (Should Review)</h2>
    ${warnings.map(f => `
    <div class="finding warning">
      <div class="file-path">${f.file}:${f.line}</div>
      <div class="message">${f.message}</div>
      <div class="code">${f.code}</div>
      <div class="fix">Fix: ${f.fix}</div>
    </div>
    `).join('')}
  </div>
  ` : ''}

  ${infos.length > 0 ? `
  <div class="section">
    <h2>ℹ️ Info (For Reference)</h2>
    <details>
      <summary>Show ${infos.length} info items</summary>
      ${infos.map(f => `
      <div class="finding info">
        <div class="file-path">${f.file}:${f.line}</div>
        <div class="message">${f.message}</div>
      </div>
      `).join('')}
    </details>
  </div>
  ` : ''}

  <div class="section">
    <h2>📋 Scroll Debugging Checklist</h2>
    <ul>
      <li>✅ Check that html/body don't have overflow:hidden</li>
      <li>✅ Verify only ONE container has overflow-y-auto per page</li>
      <li>✅ Ensure flex containers with min-h-0 have overflow-y-auto</li>
      <li>✅ Check for pointer-events-none overlays blocking interactions</li>
      <li>✅ Verify cookie domain consistency for auth</li>
      <li>✅ Test scroll on mobile (touch events)</li>
      <li>✅ Check that fixed/sticky elements don't cover scrollable area</li>
    </ul>
  </div>

</body>
</html>`;

  return html;
}

async function main() {
  console.log('🔍 Generating comprehensive scroll debug report...\n');
  
  // Find all relevant files
  const files = await glob('src/**/*.{tsx,css}', { cwd: process.cwd() });
  
  // Analyze each file
  for (const file of files) {
    await analyzeFile(resolve(process.cwd(), file));
  }
  
  // Generate report
  const html = generateReport();
  
  // Write report
  writeFileSync(REPORT_PATH, html);
  
  console.log(`✅ Report generated: ${relative(process.cwd(), REPORT_PATH)}`);
  console.log(`\n📊 Summary:`);
  console.log(`  Critical: ${findings.filter(f => f.severity === 'critical').length}`);
  console.log(`  Warnings: ${findings.filter(f => f.severity === 'warning').length}`);
  console.log(`  Info: ${findings.filter(f => f.severity === 'info').length}`);
  console.log(`\n📁 Open ${relative(process.cwd(), REPORT_PATH)} in your browser to view details`);
}

main().catch(console.error);
