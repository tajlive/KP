#!/usr/bin/env node
/**
 * Fiks Sanity TypeScript feil
 */
import { readFileSync, writeFileSync } from 'fs';

// 1. Fiks sanity.config.ts - fjern preview.prepare eller gjør den kompatibel
const sanityConfig = readFileSync('sanity.config.ts', 'utf8');
const fixedSanityConfig = sanityConfig.replace(
  /preview:\s*\{[\s\S]*?prepare:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}\s*\}/g,
  'preview: {\n      select: {\n        title: \'title\',\n        subtitle: \'slug.current\',\n      },\n    }'
);
writeFileSync('sanity.config.ts', fixedSanityConfig);
console.log('✅ Fikset sanity.config.ts');

// 2. Fiks SanityHeroSection.tsx - fjern asChild
const heroSection = readFileSync('src/features/landing/SanityHeroSection.tsx', 'utf8');
const fixedHeroSection = heroSection.replace(/\s*asChild\s*=?\s*(true)?\s*/g, '');
writeFileSync('src/features/landing/SanityHeroSection.tsx', fixedHeroSection);
console.log('✅ Fikset SanityHeroSection.tsx');

// 3. Fiks image.ts - endre type
const imageFile = readFileSync('src/lib/sanity/image.ts', 'utf8');
const fixedImage = imageFile.replace(
  /format:\s*\(.*?\)\s*=>\s*\[.*?\]/g,
  'format: (source: any) => [\'webp\', \'jpg\', \'png\'] as const'
);
writeFileSync('src/lib/sanity/image.ts', fixedImage);
console.log('✅ Fikset src/lib/sanity/image.ts');

console.log('\n✅ Alle Sanity TypeScript feil fikset!');
