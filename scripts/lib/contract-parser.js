#!/usr/bin/env node

/**
 * Contract Parser Module
 *
 * Parses and validates the Klarpakke contract file to extract page definitions
 * and anchor specifications. Serves as single source of truth for all Webflow
 * automation (creation, validation, repair).
 *
 * Usage:
 *   const parser = require('./lib/contract-parser');
 *   const contract = parser.loadContract('./webflow/contract/klarpakke-pages.v1.json');
 *   const pages = parser.getPageDefinitions();
 */

const fs = require('fs');
const path = require('path');

class ContractParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContractParseError';
  }
}

class ContractValidator {
  constructor(contract) {
    this.contract = contract;
  }

  /**
   * Validate contract schema and structure
   * Throws ContractParseError if validation fails
   */
  validate() {
    // Check contractVersion exists
    if (!this.contract.contractVersion) {
      throw new ContractParseError('Missing required field: contractVersion');
    }

    // Check pages array exists
    if (!Array.isArray(this.contract.pages)) {
      throw new ContractParseError('Missing required field: pages (must be array)');
    }

    if (this.contract.pages.length === 0) {
      throw new ContractParseError('Contract must define at least one page');
    }

    // Validate each page
    const seenPaths = new Set();
    const seenIds = new Set();

    for (let i = 0; i < this.contract.pages.length; i++) {
      const page = this.contract.pages[i];
      this._validatePage(page, i, seenPaths, seenIds);
    }

    return true;
  }

  _validatePage(page, index, seenPaths, seenIds) {
    const context = `pages[${index}]`;

    if (!page.path) {
      throw new ContractParseError(`${context}: Missing required field: path`);
    }

    if (!page.name) {
      throw new ContractParseError(`${context}: Missing required field: name`);
    }

    if (!Array.isArray(page.anchors)) {
      throw new ContractParseError(`${context}: Missing required field: anchors (must be array)`);
    }

    if (page.anchors.length === 0) {
      throw new ContractParseError(`${context}: Must define at least one anchor`);
    }

    // Check duplicate paths
    if (seenPaths.has(page.path)) {
      throw new ContractParseError(`${context}: Duplicate path "${page.path}"`);
    }
    seenPaths.add(page.path);

    // Validate anchors
    for (let j = 0; j < page.anchors.length; j++) {
      const anchor = page.anchors[j];
      this._validateAnchor(anchor, `${context}.anchors[${j}]`, seenIds);
    }
  }

  _validateAnchor(anchor, context, seenIds) {
    if (!anchor.kind) {
      throw new ContractParseError(`${context}: Missing required field: kind`);
    }

    if (!anchor.tag) {
      throw new ContractParseError(`${context}: Missing required field: tag`);
    }

    if (!anchor.attrs || typeof anchor.attrs !== 'object') {
      throw new ContractParseError(`${context}: Missing required field: attrs (must be object)`);
    }

    // Validate that each anchor has at least one identifying attribute
    const hasId = anchor.attrs.id !== undefined && anchor.attrs.id !== '';
    const hasDataAttr = Object.keys(anchor.attrs).some(k => k.startsWith('data-'));

    if (!hasId && !hasDataAttr) {
      throw new ContractParseError(
        `${context}: Anchor must have either an 'id' or 'data-*' attribute for identification`
      );
    }

    // Check for duplicate IDs
    if (anchor.attrs.id) {
      if (seenIds.has(anchor.attrs.id)) {
        throw new ContractParseError(`${context}: Duplicate ID "${anchor.attrs.id}"`);
      }
      seenIds.add(anchor.attrs.id);
    }
  }
}

/**
 * Load and parse contract file
 * @param {string} contractPath - Path to contract JSON file
 * @returns {object} Parsed and validated contract
 * @throws {ContractParseError} If contract is invalid
 */
function loadContract(contractPath) {
  const fullPath = path.resolve(contractPath);

  if (!fs.existsSync(fullPath)) {
    throw new ContractParseError(`Contract file not found: ${fullPath}`);
  }

  let contract;
  try {
    const raw = fs.readFileSync(fullPath, 'utf8');
    contract = JSON.parse(raw);
  } catch (err) {
    throw new ContractParseError(
      `Failed to parse contract JSON: ${err.message}`
    );
  }

  // Validate schema
  const validator = new ContractValidator(contract);
  validator.validate();

  return contract;
}

/**
 * Get all page definitions from loaded contract
 * @param {object} contract - Parsed contract object
 * @returns {array} Array of page definitions with normalized structure
 */
function getPageDefinitions(contract) {
  return contract.pages.map(page => ({
    path: page.path,
    name: page.name,
    anchors: page.anchors || []
  }));
}

/**
 * Get anchors for a specific page path
 * @param {object} contract - Parsed contract object
 * @param {string} pagePath - The page path to find anchors for
 * @returns {array} Array of anchor definitions, or null if page not found
 */
function getAnchorsForPage(contract, pagePath) {
  const page = contract.pages.find(p => p.path === pagePath);
  return page ? page.anchors : null;
}

/**
 * Generate HTML skeleton from anchor definitions
 * @param {array} anchors - Array of anchor definitions
 * @returns {string} HTML string with all required elements
 */
function generateHtmlFromAnchors(anchors) {
  if (!Array.isArray(anchors) || anchors.length === 0) {
    return '<div></div>';
  }

  const elements = anchors.map(anchor => {
    const tag = anchor.tag || 'div';
    const attrs = anchor.attrs || {};

    // Build attributes string
    const attrPairs = Object.entries(attrs)
      .filter(([k, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => {
        // For boolean attributes (like type="checkbox") and empty data attributes
        if (v === true) return k;
        if (v === '') return `${k}=""`;
        return `${k}="${escapeAttrValue(v)}"`;
      });

    const attrStr = attrPairs.length > 0 ? ' ' + attrPairs.join(' ') : '';

    return `<${tag}${attrStr}></${tag}>`;
  });

  // Wrap in container
  return `<div class="klarpakke-anchor-container">${elements.join('')}</div>`;
}

function escapeAttrValue(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Validate that a contract matches expected schema version
 * @param {object} contract - Parsed contract object
 * @param {string} expectedVersion - Expected version (default "1.0.0")
 * @returns {boolean} True if version matches
 */
function validateContractVersion(contract, expectedVersion = '1.0.0') {
  return contract.contractVersion === expectedVersion;
}

/**
 * Get a summary of the contract
 * @param {object} contract - Parsed contract object
 * @returns {object} Summary object with counts and metadata
 */
function getContractSummary(contract) {
  const pages = contract.pages || [];
  const anchorsPerPage = pages.map(p => ({
    path: p.path,
    name: p.name,
    anchorCount: (p.anchors || []).length
  }));

  const totalAnchors = anchorsPerPage.reduce((sum, p) => sum + p.anchorCount, 0);

  return {
    version: contract.contractVersion,
    pageCount: pages.length,
    totalAnchors,
    anchorsPerPage,
    notes: contract.notes || ''
  };
}

/**
 * Filter pages by scope
 * @param {object} contract - Parsed contract object
 * @param {string} scope - Scope filter (e.g., "pri1", "all-pages", "marketing")
 * @returns {array} Filtered page definitions
 */
function getPagesByScope(contract, scope = 'pri1') {
  // Pri1 pages from contract (all pages in base contract v1)
  if (scope === 'pri1' || scope === 'all') {
    return getPageDefinitions(contract);
  }

  // Could extend with scope filtering if contract adds scope metadata
  return getPageDefinitions(contract);
}

module.exports = {
  loadContract,
  getPageDefinitions,
  getAnchorsForPage,
  generateHtmlFromAnchors,
  validateContractVersion,
  getContractSummary,
  getPagesByScope,
  ContractParseError
};
