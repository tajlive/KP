#!/usr/bin/env node

/**
 * Report Generator Module
 *
 * Generates structured reports in multiple formats (JSON, console) from
 * automation run data. Used by designer-clicker and validator scripts.
 *
 * Usage:
 *   const generator = require('./lib/report-generator');
 *   const report = generator.generateJsonReport(runData);
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate JSON report from run data
 * @param {object} runData - Run execution data
 * @returns {object} Structured JSON report
 */
function generateJsonReport(runData) {
  const {
    runId = generateRunId(),
    timestamp = new Date().toISOString(),
    mode = 'create',
    contract = {},
    summary = {},
    details = [],
    errors = []
  } = runData;

  return {
    runId,
    timestamp,
    mode,
    contract: {
      version: contract.version || '1.0.0',
      pages: contract.pages || 0,
      totalAnchors: contract.totalAnchors || 0
    },
    summary: {
      pagesCreated: summary.pagesCreated || 0,
      pagesRepaired: summary.pagesRepaired || 0,
      pagesSkipped: summary.pagesSkipped || 0,
      pagesFailed: summary.pagesFailed || 0,
      anchorsCreated: summary.anchorsCreated || 0,
      anchorsRepaired: summary.anchorsRepaired || 0,
      anchorsExisting: summary.anchorsExisting || 0,
      anchorsFailed: summary.anchorsFailed || 0,
      success: (summary.pagesFailed || 0) === 0 && errors.length === 0
    },
    details: details || [],
    errors: errors || [],
    durationMs: runData.durationMs || 0
  };
}

/**
 * Generate human-readable console output
 * @param {object} report - JSON report from generateJsonReport
 * @returns {string} Formatted console output
 */
function generateConsoleOutput(report) {
  const lines = [];

  lines.push('');
  lines.push('╔' + '═'.repeat(58) + '╗');
  lines.push('║ ' + 'WEBFLOW AUTOMATION REPORT'.padEnd(57) + '║');
  lines.push('╠' + '═'.repeat(58) + '╣');

  // Header
  lines.push(`║ Mode: ${report.mode.toUpperCase().padEnd(53)} │`);
  lines.push(`║ Run ID: ${report.runId.padEnd(50)} │`);
  lines.push(`║ Time: ${new Date(report.timestamp).toLocaleString().padEnd(52)} │`);

  lines.push('╠' + '═'.repeat(58) + '╣');

  // Summary
  lines.push('║ SUMMARY'.padEnd(59) + '║');
  lines.push('╟' + '─'.repeat(58) + '╢');

  const {
    pagesCreated = 0,
    pagesRepaired = 0,
    pagesSkipped = 0,
    pagesFailed = 0,
    anchorsCreated = 0,
    anchorsRepaired = 0,
    anchorsExisting = 0,
    anchorsFailed = 0
  } = report.summary;

  lines.push(`║ Pages Created:   ${String(pagesCreated).padEnd(41)} │`);
  lines.push(`║ Pages Repaired:  ${String(pagesRepaired).padEnd(41)} │`);
  lines.push(`║ Pages Skipped:   ${String(pagesSkipped).padEnd(41)} │`);
  lines.push(`║ Pages Failed:    ${String(pagesFailed).padEnd(41)} │`);
  lines.push('╟' + '─'.repeat(58) + '╢');
  lines.push(`║ Anchors Created: ${String(anchorsCreated).padEnd(41)} │`);
  lines.push(`║ Anchors Repaired:${String(anchorsRepaired).padEnd(41)} │`);
  lines.push(`║ Anchors Exist:   ${String(anchorsExisting).padEnd(41)} │`);
  lines.push(`║ Anchors Failed:  ${String(anchorsFailed).padEnd(41)} │`);

  // Per-page details
  if (report.details && report.details.length > 0) {
    lines.push('╠' + '═'.repeat(58) + '╣');
    lines.push('║ DETAILS'.padEnd(59) + '║');
    lines.push('╟' + '─'.repeat(58) + '╢');

    for (const detail of report.details) {
      const statusIcon = detail.status === 'created' ? '✓' : detail.status === 'repaired' ? '⟳' : '–';
      const line = `║ ${statusIcon} ${detail.path.padEnd(54)} │`;
      lines.push(line.substring(0, 60) + '║');

      if (detail.anchors && detail.anchors.length > 0) {
        for (const anchor of detail.anchors) {
          const anchorIcon = anchor.status === 'created' ? '  ✓' : anchor.status === 'existing' ? '  ∘' : '  ✗';
          const anchorLine = `║   ${anchorIcon} ${anchor.kind.padEnd(49)} │`;
          lines.push(anchorLine.substring(0, 60) + '║');
        }
      }
    }
  }

  // Errors
  if (report.errors && report.errors.length > 0) {
    lines.push('╠' + '═'.repeat(58) + '╣');
    lines.push('║ ERRORS'.padEnd(59) + '║');
    lines.push('╟' + '─'.repeat(58) + '╢');

    for (const error of report.errors) {
      const wrapped = wrapText(error, 55);
      wrapped.forEach((line, i) => {
        const prefix = i === 0 ? '║ ✗ ' : '║   ';
        lines.push((prefix + line).padEnd(59) + '║');
      });
    }
  }

  // Footer
  const status = report.summary.success ? '✓ SUCCESS' : '✗ FAILED';
  lines.push('╠' + '═'.repeat(58) + '╣');
  lines.push(`║ ${status.padEnd(57)} │`);
  lines.push('╚' + '═'.repeat(58) + '╝');
  lines.push('');

  return lines.join('\n');
}

/**
 * Write report to file system
 * @param {string} outputPath - Directory to write report
 * @param {object} report - JSON report
 * @param {string} baseFilename - Filename without extension (default: automation-report)
 * @returns {object} Paths to written files
 */
function writeReportToFile(outputPath, report, baseFilename = 'automation-report') {
  // Ensure directory exists
  fs.mkdirSync(outputPath, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const prefix = `${baseFilename}-${report.runId}`;

  // Write JSON
  const jsonPath = path.join(outputPath, `${prefix}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  // Write console output as text
  const consolePath = path.join(outputPath, `${prefix}.txt`);
  const consoleOutput = generateConsoleOutput(report);
  fs.writeFileSync(consolePath, consoleOutput, 'utf8');

  return {
    json: jsonPath,
    text: consolePath,
    timestamp: report.timestamp,
    success: report.summary.success
  };
}

/**
 * Create a new run data object
 * @returns {object} Empty run data template
 */
function createRunData() {
  return {
    runId: generateRunId(),
    timestamp: new Date().toISOString(),
    mode: 'create',
    contract: {},
    summary: {
      pagesCreated: 0,
      pagesRepaired: 0,
      pagesSkipped: 0,
      pagesFailed: 0,
      anchorsCreated: 0,
      anchorsRepaired: 0,
      anchorsExisting: 0,
      anchorsFailed: 0
    },
    details: [],
    errors: [],
    startTime: Date.now()
  };
}

/**
 * Finalize run data with duration
 * @param {object} runData - Run data object
 * @returns {object} Finalized run data with duration
 */
function finalizeRunData(runData) {
  const endTime = Date.now();
  runData.durationMs = endTime - (runData.startTime || endTime);
  return runData;
}

/**
 * Add page detail to run data
 * @param {object} runData - Run data object
 * @param {string} path - Page path
 * @param {string} status - Status (created|repaired|skipped|failed)
 * @param {array} anchors - Anchor details
 * @param {string} error - Optional error message
 */
function addPageDetail(runData, path, status, anchors = [], error = null) {
  runData.details.push({
    path,
    status,
    anchors,
    error: error || undefined
  });

  // Update summary
  const statusKey = `pages${status.charAt(0).toUpperCase() + status.slice(1)}`;
  if (runData.summary[statusKey] !== undefined) {
    runData.summary[statusKey]++;
  }

  // Count anchors
  if (anchors.length > 0) {
    for (const anchor of anchors) {
      const anchorKey = `anchors${anchor.status.charAt(0).toUpperCase() + anchor.status.slice(1)}`;
      if (runData.summary[anchorKey] !== undefined) {
        runData.summary[anchorKey]++;
      }
    }
  }

  if (error) {
    runData.errors.push(`${path}: ${error}`);
  }
}

function generateRunId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function wrapText(text, width) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).length <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

module.exports = {
  generateJsonReport,
  generateConsoleOutput,
  writeReportToFile,
  createRunData,
  finalizeRunData,
  addPageDetail,
  generateRunId
};
