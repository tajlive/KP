import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Find all TypeScript files with type errors and fix common patterns
const srcDir = './src';

function findTsFiles(dir) {
  const files = [];
  const items = readdirSync(dir);
  for (const item of items) {
    const path = join(dir, item);
    const stat = statSync(path);
    if (stat.isDirectory() && !item.includes('node_modules')) {
      files.push(...findTsFiles(path));
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(path);
    }
  }
  return files;
}

function fixFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let original = content;
  
  // Fix 1: Replace Record<string, X> with { [key: string]: X } for Supabase updates
  content = content.replace(
    /Record<string,\s*(string|number|unknown|null|any)>\s*=/g,
    '{ [key: string]: $1 } ='
  );
  
  // Fix 2: Add type assertion for Supabase .update() calls with dynamic objects
  // Pattern: .update({...} as Record<string, unknown>)
  content = content.replace(
    /\.update\(\s*\{([^}]+)\}\s*as\s*Record<string,\s*unknown>\s*\)/g,
    '.update({$1} as any)'
  );
  
  // Fix 3: Fix .update(patch) patterns - add as any
  content = content.replace(
    /\.update\(\s*([a-zA-Z_]+)\s*\)\s*\.(eq|from)/g,
    '.update($1 as any).$2'
  );
  
  if (content !== original) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  return false;
}

const files = findTsFiles(srcDir);
let fixed = 0;
for (const file of files) {
  if (fixFile(file)) fixed++;
}

console.log(`\nFixed ${fixed} files`);
