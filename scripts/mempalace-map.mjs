#!/usr/bin/env node
/**
 * 🗺️ Mempalace Map - Interaktiv navigasjon
 * 
 * Viser hele dokumentasjonsstrukturen som et visuelt kart
 * med status for hvert rom.
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOMS = [
  {
    id: 'entrance',
    name: '🏛️ Hovedhall',
    path: 'README.md',
    description: 'Prosjektoversikt og inngang',
    color: '\x1b[36m'
  },
  {
    id: 'archive',
    name: '🏺 Arkivet',
    path: 'docs/architecture',
    description: 'Arkitektur og design',
    color: '\x1b[33m'
  },
  {
    id: 'vault',
    name: '🔒 Skattekammer',
    path: 'docs/security',
    description: 'Sikkerhet og Auth',
    color: '\x1b[31m'
  },
  {
    id: 'lab',
    name: '🧪 Laboratoriet',
    path: 'docs/testing',
    description: 'Testing og kvalitet',
    color: '\x1b[35m'
  },
  {
    id: 'forge',
    name: '🏭 Smia',
    path: '.github/workflows',
    description: 'DevOps og CI/CD',
    color: '\x1b[91m'
  },
  {
    id: 'library',
    name: '📚 Biblioteket',
    path: 'src',
    description: 'Kildekode',
    color: '\x1b[34m'
  },
  {
    id: 'strategy',
    name: '🎯 Strategirum',
    path: 'docs/product',
    description: 'Produkt og visjon',
    color: '\x1b[32m'
  },
  {
    id: 'theater',
    name: '🎭 Teateret',
    path: 'docs/ux',
    description: 'UX og Design',
    color: '\x1b[95m'
  },
  {
    id: 'maps',
    name: '🗺️ Kartograf',
    path: 'supabase',
    description: 'Database og skjema',
    color: '\x1b[90m'
  },
  {
    id: 'command',
    name: '🚨 Kommandosentral',
    path: 'docs/incidents',
    description: 'Hendelser og drift',
    color: '\x1b[37m'
  }
];

const RESET = '\x1b[0m';

function getRoomStatus(room) {
  try {
    const stats = statSync(room.path);
    const age = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);
    
    if (room.id === 'entrance') {
      return age < 7 ? 'fresh' : age < 30 ? 'stale' : 'rotten';
    }
    return age < 30 ? 'fresh' : age < 90 ? 'stale' : 'rotten';
  } catch {
    return 'missing';
  }
}

function getStatusIcon(status) {
  const icons = {
    fresh: '✨',
    stale: '⚠️',
    rotten: '💀',
    missing: '🏚️'
  };
  return icons[status] || '❓';
}

function getStatusColor(status) {
  const colors = {
    fresh: '\x1b[32m',
    stale: '\x1b[33m',
    rotten: '\x1b[31m',
    missing: '\x1b[90m'
  };
  return colors[status] || '\x1b[0m';
}

function countFiles(dir) {
  try {
    if (statSync(dir).isFile()) return 1;
    return readdirSync(dir, { recursive: true }).filter(f => 
      f.endsWith('.md') || f.endsWith('.ts') || f.endsWith('.tsx')
    ).length;
  } catch {
    return 0;
  }
}

function drawMap() {
  console.clear();
  console.log('\n' + '═'.repeat(70));
  console.log('              🏛️  K L A R P A K K E   M E M P A L A C E');
  console.log('═'.repeat(70) + '\n');

  // Top row
  console.log('    ┌─────────────────────────────────────────────────────────┐');
  console.log('    │                                                         │');
  
  const strategy = ROOMS.find(r => r.id === 'strategy');
  const command = ROOMS.find(r => r.id === 'command');
  
  console.log(`    │   ${strategy.color}🎯 Strategirum${RESET}                          ${command.color}🚨 Kommandosentral${RESET}   │`);
  console.log(`    │   (${getStatusIcon(getRoomStatus(strategy))} ${countFiles(strategy.path)} files)                    (${getStatusIcon(getRoomStatus(command))} ${countFiles(command.path)} files)   │`);
  console.log('    │         │                                        │       │');
  console.log('    │         └──────────────┬─────────────────────────┘       │');
  console.log('    │                        │                                 │');
  
  // Middle section
  const archive = ROOMS.find(r => r.id === 'archive');
  const vault = ROOMS.find(r => r.id === 'vault');
  const lab = ROOMS.find(r => r.id === 'lab');
  
  console.log(`    │  ${archive.color}🏺 Arkivet${RESET} ←──────┼──────→ ${vault.color}🔒 Skattekam.${RESET}    │`);
  console.log(`    │  (${getStatusIcon(getRoomStatus(archive))} ${countFiles(archive.path)} files)         │          (${getStatusIcon(getRoomStatus(vault))} ${countFiles(vault.path)} files)    │`);
  console.log('    │       │              │               │                 │');
  console.log('    │       └──────────────┼───────────────┘                 │');
  console.log('    │                      │                                   │');
  
  // Entrance
  const entrance = ROOMS.find(r => r.id === 'entrance');
  const status = getRoomStatus(entrance);
  console.log(`    │                   ${entrance.color}🏛️ HOVEDHALL${RESET}                      │`);
  console.log(`    │                   ${getStatusColor(status)}${getStatusIcon(status)} ${entrance.name}${RESET}                      │`);
  console.log('    │                      │                                   │');
  console.log('    │       ┌──────────────┼───────────────┐                 │');
  console.log('    │       │              │               │                 │');
  
  // Bottom row
  const library = ROOMS.find(r => r.id === 'library');
  const forge = ROOMS.find(r => r.id === 'forge');
  const theater = ROOMS.find(r => r.id === 'theater');
  
  console.log(`    │  ${library.color}📚 Bibliotek${RESET} ←──────┼──────→ ${forge.color}🏭 Smia${RESET}         │`);
  console.log(`    │  (${getStatusIcon(getRoomStatus(library))} ${countFiles(library.path)} files)        │          (${getStatusIcon(getRoomStatus(forge))} ${countFiles(forge.path)} files)    │`);
  console.log('    │       │              │               │                 │');
  console.log('    │       └──────────────┼───────────────┘                 │');
  console.log('    │                      │                                   │');
  
  const maps = ROOMS.find(r => r.id === 'maps');
  console.log(`    │              ${theater.color}🎭 Teateret${RESET} ←──┴──→ ${maps.color}🗺️ Kartograf${RESET}      │`);
  console.log(`    │              (${getStatusIcon(getRoomStatus(theater))} ${countFiles(theater.path)} files)      (${getStatusIcon(getRoomStatus(maps))} files)      │`);
  console.log('    │                                                         │');
  console.log('    └─────────────────────────────────────────────────────────┘');
  
  // Legend
  console.log('\n┌─ Legend ───────────────────────────────────────────────────────────┐');
  console.log('│ ✨ Fresh (< 30 dager)  ⚠️ Stale (30-90 dager)  💀 Rotten (> 90)    │');
  console.log('│ 🏚️ Missing                                            🏛️ Entrance │');
  console.log('└────────────────────────────────────────────────────────────────────┘');
  
  // Navigation hint
  console.log('\n💡 Tips: Run `node scripts/mempalace-guard.mjs` for detailed report');
  console.log('         Run `cat docs/MEMPALACE.md` for navigation guide\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  drawMap();
}

export { drawMap };
