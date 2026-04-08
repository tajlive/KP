#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const replacements = {
  // Feil → Riktig
  'bg-kp-danger-bg': 'bg-kp-danger',
  'border-kp-border-dark': 'border-kp-dark-border',
  'bg-kp-bg-hover': 'bg-kp-brand-hover',
  'bg-kp-input-bg': 'bg-kp-bg-secondary',
  'border-kp-input-border': 'border-kp-border',
  'text-kp-input-text': 'text-kp-text-primary',
  'text-kp-brand-hover': 'text-kp-brand',
  'border-kp-border-light': 'border-kp-light',
  'bg-kp-success-bg': 'bg-kp-success',
};

const files = [
  'src/features/dashboard/PaperTradingCard.tsx',
  'src/features/settings/ThemeSettings.tsx',
  'src/features/trading/OrderEntry.tsx',
  'src/features/trading/PositionsTable.tsx',
  'src/features/trading/SignalFeed.tsx',
  'src/features/trading/StrategyConfig.tsx',
  'src/features/trading/TradeAmountSlider.tsx',
  'src/features/trading/components/RecentTradesTable.tsx',
  'src/features/trading/components/TradeDetailsDrawer.tsx',
  'src/features/trading/components/TradingModeSelector.tsx',
];

let totalFixes = 0;

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf8');
    let fixes = 0;
    
    for (const [wrong, right] of Object.entries(replacements)) {
      const regex = new RegExp(wrong, 'g');
      const count = (content.match(regex) || []).length;
      if (count > 0) {
        content = content.replace(regex, right);
        fixes += count;
        console.log(`  ${file}: ${wrong} → ${right} (${count}x)`);
      }
    }
    
    if (fixes > 0) {
      writeFileSync(file, content);
      totalFixes += fixes;
    }
  } catch (err) {
    console.error(`  Error in ${file}: ${err.message}`);
  }
}

console.log(`\n✅ Total: ${totalFixes} klasser fikset i ${files.length} filer`);
