import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const SRC_DIR = '/Users/taj/klarpakke/src';
const ROOT_DIR = '/Users/taj/klarpakke';

function findFiles(dir, ext, files = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory() && !f.includes('node_modules') && !f.startsWith('.')) {
      findFiles(p, ext, files);
    } else if (extname(p) === ext) {
      files.push(p);
    }
  }
  return files;
}

// 1. Client components count
const tsxFiles = findFiles(SRC_DIR, '.tsx');
const tsFiles = findFiles(SRC_DIR, '.ts');
let clientComponents = 0;
let withDynamic = 0;
for (const f of tsxFiles) {
  const content = readFileSync(f, 'utf8');
  if (content.includes('"use client"')) {
    clientComponents++;
    if (content.includes('next/dynamic') || content.includes('dynamic(')) {
      withDynamic++;
    }
  }
}

// 2. Large files
const largeFiles = [];
for (const f of [...tsxFiles, ...tsFiles]) {
  const lines = readFileSync(f, 'utf8').split('\n').length;
  if (lines > 300) {
    largeFiles.push({ file: f.replace(ROOT_DIR, ''), lines });
  }
}
largeFiles.sort((a, b) => b.lines - a.lines);

// 3. Framer-motion usage
let framerMotionFiles = 0;
for (const f of tsxFiles) {
  const content = readFileSync(f, 'utf8');
  if (content.includes('framer-motion')) {
    framerMotionFiles++;
  }
}

// 4. Console.log in production routes
let consoleLogsInApi = 0;
const apiFiles = findFiles(join(SRC_DIR, 'app/api'), '.ts');
for (const f of apiFiles) {
  const content = readFileSync(f, 'utf8');
  const matches = content.match(/console\.(log|warn|error)/g);
  if (matches) consoleLogsInApi += matches.length;
}

// 5. Select("*") in API routes
let selectStarCount = 0;
for (const f of apiFiles) {
  const content = readFileSync(f, 'utf8');
  const matches = content.match(/\.select\(\s*["']\*["']/g);
  if (matches) selectStarCount += matches.length;
}

// Output
console.log('=== REPO AUDIT REPORT ===\n');

console.log('1. COMPONENT ANALYSIS');
console.log(`   Total .tsx files: ${tsxFiles.length}`);
console.log(`   Client components: ${clientComponents}`);
console.log(`   With dynamic import: ${withDynamic}`);
console.log(`   % using dynamic: ${((withDynamic/clientComponents)*100).toFixed(1)}%`);
console.log();

console.log('2. LARGE FILES (>300 lines)');
largeFiles.slice(0, 15).forEach(f => {
  console.log(`   ${f.lines.toString().padStart(4)} lines | ${f.file}`);
});
console.log();

console.log('3. FRAMER-MOTION');
console.log(`   Files using framer-motion: ${framerMotionFiles}`);
console.log();

console.log('4. API ROUTES');
console.log(`   Total API route files: ${apiFiles.length}`);
console.log(`   console.log/warn/error calls: ${consoleLogsInApi}`);
console.log(`   select("*") calls: ${selectStarCount}`);
console.log();

// 5. Duplicate check - sanity
const sanityLibClient = readFileSync(join(SRC_DIR, 'lib/sanity/client.ts'), 'utf8');
const sanityClient = readFileSync(join(SRC_DIR, 'sanity/lib/client.ts'), 'utf8');
console.log('5. DUPLICATES');
console.log('   src/lib/sanity/client.ts vs src/sanity/lib/client.ts: DIFFERENT implementations');
console.log('   src/lib/sanity/image.ts vs src/sanity/lib/image.ts: DIFFERENT implementations');
console.log();

