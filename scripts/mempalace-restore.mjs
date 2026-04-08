#!/usr/bin/env node
/**
 * 🔄 Mempalace Restore - Gjenopprett session etter restart
 */

import { readFileSync } from 'fs';

const MEMORY_FILE = '.mempalace/session-memory.json';

function restore() {
  console.log('🏛️  MEMPALACE SESSION RESTORE\n');
  
  try {
    const memory = JSON.parse(readFileSync(MEMORY_FILE, 'utf8'));
    
    console.log(`Session: ${memory.session_id}`);
    console.log(`Timestamp: ${memory.timestamp}`);
    console.log(`Status: ${memory.status}\n`);
    
    console.log('═'.repeat(60));
    console.log('COMPLETED');
    console.log('═'.repeat(60));
    console.log(`✅ TypeScript: ${memory.completed.typescript_fixes}`);
    console.log(`✅ Tests: ${memory.completed.tests}`);
    console.log(`✅ Workflows: ${memory.completed.workflows}`);
    console.log(`✅ Mempalace MCP:`);
    console.log(`   - Server: ${memory.completed.mempalace_mcp.server}`);
    console.log(`   - Indexed: ${memory.completed.mempalace_mcp.indexed_entries} entries`);
    console.log(`   - Shortcuts: ${memory.completed.mempalace_mcp.shortcuts.join(', ')}`);
    console.log(`   - Performance: ${memory.completed.mempalace_mcp.performance}\n`);
    
    console.log('═'.repeat(60));
    console.log('REMAINING BLOCKERS');
    console.log('═'.repeat(60));
    console.log(`Launch Readiness: ${memory.remaining_blockers.launch_readiness}\n`);
    memory.remaining_blockers.typescript.forEach(err => {
      console.log(`  ❌ ${err}`);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log('NEXT ACTIONS');
    console.log('═'.repeat(60));
    memory.next_actions.forEach((action, i) => {
      console.log(`  ${i + 1}. ${action}`);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log('QUICK COMMANDS');
    console.log('═'.repeat(60));
    Object.entries(memory.commands).forEach(([name, cmd]) => {
      console.log(`  ${name}: ${cmd}`);
    });
    
    console.log('\n🏛️  Ready to continue!\n');
    
  } catch (e) {
    console.log('❌ No session memory found');
    console.log('   Run: npm run mempalace:init');
  }
}

restore();
