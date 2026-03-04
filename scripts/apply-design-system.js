#!/usr/bin/env node

/**
 * Apply Coinbase Design System Classes to Webflow Elements
 *
 * This script automatically applies design system classes based on element types
 * and contract definitions. Perfect for Webflow integration.
 *
 * Usage:
 *   node scripts/apply-design-system.js [options]
 *
 * Options:
 *   --preview      Show what would be changed (dry-run)
 *   --page         Specific page path (/app/dashboard, /signup, etc)
 *   --element      Specific element selector
 *   --generate     Generate HTML templates
 *   --help         Show this help
 */

const fs = require('fs');
const path = require('path');

// Design System Class Mappings
const DESIGN_CLASSES = {
  // Buttons
  'button[type="submit"]': {
    add: ['cb-button', 'cb-button-primary'],
    description: 'Primary submit button'
  },
  'button:not([type])': {
    add: ['cb-button', 'cb-button-secondary'],
    description: 'Secondary button'
  },

  // Inputs
  'input[type="email"]': {
    add: ['cb-input'],
    attrs: { placeholder: 'Email' },
    description: 'Email input field'
  },
  'input[type="password"]': {
    add: ['cb-input'],
    attrs: { placeholder: 'Password' },
    description: 'Password input field'
  },
  'input[type="text"]': {
    add: ['cb-input'],
    description: 'Text input field'
  },

  // Cards
  '.card': {
    add: ['cb-card'],
    description: 'Card container'
  },
  '[class*="balance"]': {
    add: ['cb-balance-card'],
    description: 'Balance display card'
  },

  // Forms
  'form': {
    add: ['cb-form'],
    description: 'Form container'
  },

  // Sections
  'section': {
    add: ['cb-section'],
    description: 'Page section'
  },

  // Headers
  'h1': {
    add: ['cb-h1'],
    description: 'Main heading'
  },
  'h2': {
    add: ['cb-h2'],
    description: 'Section heading'
  },
  'h3': {
    add: ['cb-h3'],
    description: 'Card heading'
  },

  // Badges
  '[class*="badge"]': {
    add: ['cb-badge', 'cb-badge-primary'],
    description: 'Badge label'
  },
  '[data-paper-trading-badge]': {
    add: ['cb-badge', 'cb-badge-paper-trading'],
    description: 'Paper trading demo badge'
  },

  // Paper Trading Elements
  '[id*="paper-trading"]': {
    add: ['cb-paper-trading'],
    description: 'Paper trading container'
  },
  '[data-kp-feature="paper-trading"]': {
    add: ['cb-paper-trading'],
    description: 'Paper trading root (from contract)'
  },

  // Balance Overview (from contract)
  '[class*="balance-overview"]': {
    add: ['cb-balance-overview'],
    description: 'Balance overview grid (3 columns)'
  },

  // Signals
  '[class*="signal"]': {
    add: ['cb-signal-card'],
    description: 'Trading signal card'
  },
};

// Page-specific class mappings (from contract v1.1.0)
const PAGE_CLASSES = {
  '/': {
    heroSection: { add: ['cb-hero'] },
    '[id*="hero"]': { add: ['cb-hero-section'] },
  },
  '/signup': {
    '#signup-form': { add: ['cb-form', 'cb-form-signup'] },
    'form': { add: ['cb-card'] },
  },
  '/login': {
    '#login-form': { add: ['cb-form', 'cb-form-login'] },
    'form': { add: ['cb-card', 'cb-card-elevated'] },
  },
  '/app/dashboard': {
    '[id="klarpakke-paper-trading-root"]': { add: ['cb-paper-trading'] },
    '[data-paper-trading-badge]': { add: ['cb-badge', 'cb-badge-paper-trading'] },
    '[class*="balance"]': { add: ['cb-balance-card'] },
  },
  '/app/settings': {
    'form': { add: ['cb-form'] },
    '[type="checkbox"]': { add: ['cb-checkbox'] },
  },
  '/app/profile': {
    '[class*="profile"]': { add: ['cb-card', 'cb-card-elevated'] },
  },
};

// HTML Template Generator
function generateTemplate(type, options = {}) {
  const templates = {
    'balance-card': `<div class="cb-balance-card">
  <div class="cb-balance-label">${options.label || 'Balance'}</div>
  <div class="cb-balance-amount">${options.amount || '$0.00'}</div>
  <div class="cb-balance-change ${options.trend || 'positive'}">
    <span class="arrow">${options.trend === 'positive' ? '↑' : '↓'}</span>
    ${options.change || '+0%'}
  </div>
</div>`,

    'paper-trading': `<div class="cb-paper-trading" id="klarpakke-paper-trading-root" data-kp-feature="paper-trading">
  <div class="cb-paper-trading-header">
    <h3 class="cb-paper-trading-title">Paper Trading Mode</h3>
    <span class="cb-badge cb-badge-paper-trading" data-paper-trading-badge>
      ⚪ Demo Account
    </span>
  </div>
  <div class="cb-paper-trading-stats">
    <div class="cb-paper-stat">
      <div class="cb-paper-stat-label">Virtual Balance</div>
      <div class="cb-paper-stat-value">$10,000.00</div>
    </div>
  </div>
</div>`,

    'signal-card': `<div class="cb-signal-card">
  <div class="cb-signal-header">
    <div>
      <h3 class="cb-signal-title">${options.title || 'Signal'}</h3>
      <p class="cb-signal-type">${options.type || 'Trading Signal'}</p>
    </div>
    <span class="cb-badge cb-badge-primary">Active</span>
  </div>
  <p class="cb-signal-description">${options.description || 'Signal description'}</p>
  <div class="cb-signal-actions">
    <button class="cb-button cb-button-primary cb-button-sm">Execute</button>
    <button class="cb-button cb-button-secondary cb-button-sm">Details</button>
  </div>
</div>`,

    'button': `<button class="cb-button cb-button-primary">${options.text || 'Button'}</button>`,

    'input': `<input type="${options.type || 'text'}" class="cb-input" placeholder="${options.placeholder || 'Enter text'}">`,

    'card': `<div class="cb-card">
  <h3>${options.title || 'Card Title'}</h3>
  <p>${options.content || 'Card content'}</p>
</div>`,
  };

  return templates[type] || `<!-- Template not found for type: ${type} -->`;
}

// Main Script Logic
class DesignSystemApplier {
  constructor(options = {}) {
    this.options = options;
    this.changes = [];
    this.preview = options.preview || false;
  }

  applyToPage(pagePath) {
    console.log(`\n📄 Applying Design System to: ${pagePath}`);
    console.log('═'.repeat(60));

    const pageRules = PAGE_CLASSES[pagePath] || {};

    Object.entries(pageRules).forEach(([selector, rule]) => {
      this.changes.push({
        selector,
        classes: rule.add,
        page: pagePath,
      });
    });

    this.printChanges();
  }

  applyGlobally() {
    console.log('\n🎨 Applying Design System Globally');
    console.log('═'.repeat(60));

    Object.entries(DESIGN_CLASSES).forEach(([selector, rule]) => {
      this.changes.push({
        selector,
        classes: rule.add,
        description: rule.description,
      });
    });

    this.printChanges();
  }

  generateHTML(componentType, options = {}) {
    console.log(`\n📝 Generating HTML for: ${componentType}`);
    console.log('═'.repeat(60));

    const html = generateTemplate(componentType, options);
    console.log(html);
    console.log('\n✅ Copy the HTML above and paste into Webflow Designer');
  }

  printChanges() {
    console.log(`\n📊 Changes Summary:`);
    console.log(`Total selectors: ${this.changes.length}`);
    console.log(`Preview mode: ${this.preview ? '✓ Yes' : '✗ No (would apply)'}`);

    console.log('\n📋 Details:');
    this.changes.forEach((change, index) => {
      console.log(`\n${index + 1}. ${change.selector}`);
      console.log(`   Classes: ${change.classes.join(' ')}`);
      if (change.description) console.log(`   Description: ${change.description}`);
      if (change.page) console.log(`   Page: ${change.page}`);
    });

    if (!this.preview && this.changes.length > 0) {
      console.log(`\n✅ Ready to apply ${this.changes.length} changes!`);
      console.log('💾 Run with --preview flag to see changes without applying');
    }
  }

  printHelp() {
    console.log(`
🎨 Coinbase Design System Applier
═════════════════════════════════════

Apply design system classes to Webflow elements automatically.

USAGE:
  node scripts/apply-design-system.js [options]

OPTIONS:
  --preview       Show changes without applying (dry-run)
  --page PATH     Apply to specific page (/app/dashboard, /signup, etc)
  --global        Apply to all pages and selectors
  --generate      Generate HTML templates
  --template TYPE Generate specific template (balance-card, button, card, etc)
  --help          Show this help message

EXAMPLES:
  # Preview changes for dashboard
  node scripts/apply-design-system.js --preview --page /app/dashboard

  # Generate balance card HTML
  node scripts/apply-design-system.js --generate --template balance-card

  # Generate paper trading component
  node scripts/apply-design-system.js --generate --template paper-trading

  # See all possible changes
  node scripts/apply-design-system.js --global --preview

TEMPLATES AVAILABLE:
  - balance-card      Balance display (with amount, change %)
  - paper-trading     Paper trading banner (demo account)
  - signal-card       Trading signal card
  - button            Primary button
  - input             Text input field
  - card              Generic card container

MORE INFO:
  Design System Docs: docs/COINBASE-DESIGN-SYSTEM.md
  Deployment Guide:   docs/DESIGN-SYSTEM-DEPLOYMENT.md
  Webflow Template:   docs/WEBFLOW-DASHBOARD-TEMPLATE.md
    `);
  }
}

// CLI Arguments Parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    preview: false,
    page: null,
    global: false,
    generate: false,
    template: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--preview':
        options.preview = true;
        break;
      case '--global':
        options.global = true;
        break;
      case '--generate':
        options.generate = true;
        break;
      case '--help':
        options.help = true;
        break;
      case '--page':
        options.page = args[++i];
        break;
      case '--template':
        options.template = args[++i];
        break;
    }
  }

  return options;
}

// Main Execution
if (require.main === module) {
  const options = parseArgs();
  const applier = new DesignSystemApplier(options);

  if (options.help) {
    applier.printHelp();
  } else if (options.generate && options.template) {
    applier.generateHTML(options.template);
  } else if (options.generate) {
    console.log('🎨 Available Templates:');
    console.log('  - balance-card\n  - paper-trading\n  - signal-card\n  - button\n  - input\n  - card');
    console.log('\nUsage: node scripts/apply-design-system.js --generate --template [name]');
  } else if (options.page) {
    applier.applyToPage(options.page);
  } else if (options.global) {
    applier.applyGlobally();
  } else {
    applier.printHelp();
  }
}

module.exports = { DesignSystemApplier, generateTemplate };
