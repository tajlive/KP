#!/usr/bin/env node
/**
 * 🔗 KIMI-Mempalace Bridge
 * 
 * Brukes av KIMI for å få supermenneskelig kontekst.
 * Kjører som pre-prosessering før KIMI sine prompts.
 */

import { readFileSync, existsSync } from 'fs';

const MEMPALACE_PORT = process.env.MEMPALACE_PORT || 3456;
const MEMPALACE_URL = `http://localhost:${MEMPALACE_PORT}`;

class KIMIMempalaceBridge {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 60000; // 1 minutt
  }

  async fetchContext(endpoint, params = {}) {
    const url = new URL(endpoint, MEMPALACE_URL);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  async getContext(query) {
    // Sjekk cache
    const cacheKey = `ctx:${query}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.time < this.cacheTTL) {
      return cached.data;
    }
    
    const context = await this.fetchContext('/context', { q: query });
    if (context) {
      this.cache.set(cacheKey, { data: context, time: Date.now() });
    }
    return context;
  }

  async findDefinition(symbol) {
    return await this.fetchContext('/index', { symbol });
  }

  async predictIssues(files) {
    return await this.fetchContext('/predict', { files: files.join(',') });
  }

  // Hovedfunksjon: Berik prompt med kontekst
  async enrichPrompt(originalPrompt, options = {}) {
    const enriched = {
      original: originalPrompt,
      context: null,
      suggestions: [],
      warnings: []
    };
    
    // 1. Detekter domene fra prompt
    const domains = this.detectDomains(originalPrompt);
    if (domains.length > 0) {
      enriched.context = await this.getContext(`@${domains[0]}`);
    }
    
    // 2. Finn symbol-definisjoner
    const symbols = this.extractSymbols(originalPrompt);
    if (symbols.length > 0) {
      enriched.definitions = [];
      for (const symbol of symbols) {
        const defs = await this.findDefinition(symbol);
        if (defs) enriched.definitions.push(...defs);
      }
    }
    
    // 3. Prediker problemer hvis kode endres
    if (options.modifiedFiles) {
      enriched.warnings = await this.predictIssues(options.modifiedFiles);
    }
    
    // 4. Generer KIMI-optimalisert prompt
    enriched.optimizedPrompt = this.buildOptimizedPrompt(originalPrompt, enriched);
    
    return enriched;
  }

  detectDomains(prompt) {
    const domains = [];
    const patterns = {
      trading: /trade|order|session|execute|position/i,
      auth: /auth|login|user|session|token|jwt/i,
      db: /database|supabase|migration|table|query/i,
      test: /test|spec|vitest|playwright|e2e/i,
      ui: /component|react|tsx|jsx|render/i
    };
    
    for (const [domain, pattern] of Object.entries(patterns)) {
      if (pattern.test(prompt)) domains.push(domain);
    }
    return domains;
  }

  extractSymbols(prompt) {
    const symbols = [];
    
    // Match CamelCase/PascalCase ord
    const camelCase = prompt.match(/\b[A-Z][a-z]+[A-Z]\w*\b/g) || [];
    symbols.push(...camelCase);
    
    // Match spesifikke mønstre
    const typePatterns = prompt.match(/\b(Trade|User|Session|Order|Auth)\w*\b/g) || [];
    symbols.push(...typePatterns);
    
    return [...new Set(symbols)];
  }

  buildOptimizedPrompt(original, enriched) {
    let optimized = original;
    
    // Legg til kontekst
    if (enriched.context?.files) {
      optimized += `\n\n[Relevant files: ${enriched.context.files.slice(0, 5).join(', ')}]`;
    }
    
    // Legg til definisjoner
    if (enriched.definitions?.length > 0) {
      optimized += `\n\n[Definitions found in: ${enriched.definitions.map(d => d.file).join(', ')}]`;
    }
    
    // Legg til advarsler
    if (enriched.warnings?.length > 0) {
      const critical = enriched.warnings.filter(w => w.severity === 'error');
      if (critical.length > 0) {
        optimized += `\n\n[⚠️ CRITICAL: ${critical.map(w => w.message).join('; ')}]`;
      }
    }
    
    return optimized;
  }
}

// CLI-bruk
async function main() {
  const bridge = new KIMIMempalaceBridge();
  
  const query = process.argv[2];
  if (!query) {
    console.log('Usage: kimi-mempalace-bridge "<query>"');
    process.exit(1);
  }
  
  const enriched = await bridge.enrichPrompt(query, {
    modifiedFiles: process.argv.slice(3)
  });
  
  console.log('=== ENRICHED CONTEXT ===\n');
  console.log('Original:', enriched.original);
  console.log('\nOptimized:', enriched.optimizedPrompt);
  console.log('\nContext:', JSON.stringify(enriched.context, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { KIMIMempalaceBridge };
