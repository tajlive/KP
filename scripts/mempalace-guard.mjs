#!/usr/bin/env node
/**
 * 🏛️ Mempalace Guard - Dokumentasjonsvakt
 * 
 * Sjekker at dokumentasjonen er:
 * 1. Komplett (alle rom finnes)
 * 2. Oppdatert (sist endret < 30 dager)
 * 3. Konsistent (lenker fungerer)
 * 4. Relevant (matcher kodeendringer)
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { execSync } from 'child_process';

const DOCS_ROOT = './docs';
const MEMPALACE_STRUCTURE = {
  'README.md': { required: true, maxAge: 7 },
  'architecture/': { 
    files: ['ROUTE-INVENTORY-2026.md', 'TYPE-DEBT-ROADMAP-2026.md'],
    maxAge: 30
  },
  'security/': {
    files: ['GITHUB-OPERATING-MODEL.md'],
    maxAge: 60
  },
  'testing/': {
    files: ['TEST-CALIBRATION-2026.md', 'WATCHDOG-EXTERNAL-USER.md'],
    maxAge: 14
  },
  'automation/': {
    files: ['FULL-AUTOMATION-PLAYBOOK.md'],
    maxAge: 30
  },
  'product/': {
    files: ['product-principles-2026.md', 'TARGET-AUDIENCE.md'],
    maxAge: 90
  },
  'incidents/': {
    files: [],
    maxAge: 365
  }
};

const COLORS = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

class MempalaceGuard {
  issues = [];
  warnings = [];
  stats = { checked: 0, ok: 0, outdated: 0, missing: 0 };

  log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  checkFile(filePath, maxAge) {
    this.stats.checked++;
    
    try {
      const stats = statSync(filePath);
      const age = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);
      
      if (age > maxAge) {
        this.stats.outdated++;
        this.warnings.push(`${filePath} is ${Math.round(age)} days old (max: ${maxAge})`);
        return 'outdated';
      }
      
      this.stats.ok++;
      return 'ok';
    } catch {
      this.stats.missing++;
      this.issues.push(`${filePath} does not exist`);
      return 'missing';
    }
  }

  checkLinks(content, filePath) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[2]);
    }
    
    const broken = links.filter(link => {
      if (link.startsWith('http')) return false; // Skip external
      try {
        statSync(join(filePath, '..', link));
        return false;
      } catch {
        return true;
      }
    });
    
    return broken;
  }

  scan() {
    this.log('🏛️  Mempalace Guard - Scanning documentation...\n', 'blue');

    // Check README
    const readmeStatus = this.checkFile('README.md', 7);
    this.log(`📋 README.md: ${readmeStatus}`, readmeStatus === 'ok' ? 'green' : 'yellow');

    // Check each room
    for (const [room, config] of Object.entries(MEMPALACE_STRUCTURE)) {
      if (room === 'README.md') continue;
      
      const roomPath = join(DOCS_ROOT, room);
      const roomExists = this.checkRoomExists(roomPath);
      
      if (!roomExists) {
        this.log(`🏚️  ${room}: MISSING`, 'red');
        continue;
      }

      // Check required files
      const requiredFiles = config.files || [];
      let roomIssues = 0;
      
      for (const file of requiredFiles) {
        const filePath = join(roomPath, file);
        const status = this.checkFile(filePath, config.maxAge);
        
        if (status !== 'ok') roomIssues++;
      }

      // Check for broken links in existing files
      const roomFiles = this.getMarkdownFiles(roomPath);
      for (const file of roomFiles) {
        try {
          const content = readFileSync(file, 'utf8');
          const broken = this.checkLinks(content, file);
          
          if (broken.length > 0) {
            this.warnings.push(`${relative('.', file)} has broken links: ${broken.join(', ')}`);
            roomIssues++;
          }

          // Check if doc references code that changed
          const codeRefs = this.extractCodeReferences(content);
          for (const ref of codeRefs) {
            if (this.codeChangedRecently(ref)) {
              this.warnings.push(`${relative('.', file)} references ${ref} which changed recently`);
            }
          }
        } catch (e) {
          // Skip unreadable files
        }
      }

      const statusColor = roomIssues === 0 ? 'green' : (roomIssues > 2 ? 'red' : 'yellow');
      this.log(`🏛️  ${room}: ${roomIssues === 0 ? 'OK' : `${roomIssues} issues`}`, statusColor);
    }

    this.printSummary();
    return this.issues.length === 0;
  }

  checkRoomExists(path) {
    try {
      statSync(path);
      return true;
    } catch {
      return false;
    }
  }

  getMarkdownFiles(dir) {
    try {
      return readdirSync(dir, { recursive: true })
        .filter(f => f.endsWith('.md'))
        .map(f => join(dir, f));
    } catch {
      return [];
    }
  }

  extractCodeReferences(content) {
    // Match references like `src/lib/...` or `ComponentName`
    const refs = [];
    const patterns = [
      /`src\/([^`]+)`/g,
      /\*\*src\/([^\*]+)\*\*/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        refs.push('src/' + match[1]);
      }
    }
    
    return refs;
  }

  codeChangedRecently(filePath, days = 7) {
    try {
      const result = execSync(`git log --since="${days} days ago" --oneline -- ${filePath} | wc -l`, 
        { encoding: 'utf8' });
      return parseInt(result.trim()) > 0;
    } catch {
      return false;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    this.log('📊 SUMMARY', 'blue');
    console.log('='.repeat(60));
    
    console.log(`\nFiles checked: ${this.stats.checked}`);
    console.log(`✅ Up to date: ${this.stats.ok}`);
    console.log(`⚠️  Outdated: ${this.stats.outdated}`);
    console.log(`❌ Missing: ${this.stats.missing}`);
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
      this.warnings.forEach(w => this.log(`  - ${w}`, 'yellow'));
    }
    
    if (this.issues.length > 0) {
      console.log(`\n❌ ERRORS (${this.issues.length}):`);
      this.issues.forEach(i => this.log(`  - ${i}`, 'red'));
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.issues.length === 0 && this.warnings.length === 0) {
      this.log('✨ Mempalace is in perfect condition!', 'green');
    } else if (this.issues.length === 0) {
      this.log('⚠️  Mempalace needs attention', 'yellow');
    } else {
      this.log('🚨 Mempalace requires immediate maintenance!', 'red');
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const guard = new MempalaceGuard();
  const success = guard.scan();
  process.exit(success ? 0 : 1);
}

export { MempalaceGuard };
