#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..', 'src', 'app');

function findPageFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findPageFiles(fullPath, files);
    } else if (item === 'page.tsx' || item === 'page.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

function addEdgeRuntime(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already has runtime export
  if (content.includes('export const runtime')) {
    console.log(`  ⏭️  Skipped: ${filePath}`);
    return false;
  }
  
  // Split into lines
  const lines = content.split('\n');
  
  // Find the right position to insert
  let insertIndex = 0;
  let foundUseClient = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip shebang if any
    if (i === 0 && line.startsWith('#!')) {
      insertIndex = 1;
      continue;
    }
    
    // Track "use client"
    if (line === '"use client"' || line === "'use client'") {
      foundUseClient = true;
      insertIndex = i + 1;
      continue;
    }
    
    // If we found "use client", insert after it
    if (foundUseClient && line !== '') {
      insertIndex = i;
      break;
    }
    
    // If no "use client", insert before first non-comment, non-empty line
    if (!foundUseClient && line !== '' && !line.startsWith('//') && !line.startsWith('/*')) {
      insertIndex = i;
      break;
    }
  }
  
  // Insert the runtime export
  const before = lines.slice(0, insertIndex);
  const after = lines.slice(insertIndex);
  
  const newContent = [
    ...before,
    '',
    "export const runtime = 'edge';",
    '',
    ...after
  ].join('\n');
  
  fs.writeFileSync(filePath, newContent);
  console.log(`  ✅ Updated: ${filePath}`);
  return true;
}

console.log('🔧 Adding Edge Runtime to all page files...\n');

const pageFiles = findPageFiles(APP_DIR);
let updated = 0;
let skipped = 0;

for (const file of pageFiles) {
  if (addEdgeRuntime(file)) {
    updated++;
  } else {
    skipped++;
  }
}

console.log(`\n✅ Updated ${updated} files`);
console.log(`⏭️  Skipped ${skipped} files`);
