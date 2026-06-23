import { readFileSync, writeFileSync } from 'fs';

const files = [
  'src/lib/paper-trading/supabase.ts',
  // NOTE: src/lib/trading/core/execute-trade-safe.ts was deleted in C2 refactor.
  'src/lib/trading/emergency.ts',
  'src/lib/trading/risk.ts',
  'src/lib/trial/trial-manager.ts',
  'src/lib/compliance/kyc.ts',
  'src/lib/hooks/useThemePreference.ts',
  'src/lib/hooks/useTradingMode.ts',
  'src/hooks/useProfileQuery.ts',
  'src/app/api/binance/keys/route.ts',
  'src/app/api/stripe/verify-session/route.ts',
  'src/features/onboarding/SpeedOnboarding.tsx',
  'src/features/settings/NotificationSettings.tsx',
];

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf-8');
    
    // Fix .update({...}) without as any
    content = content.replace(
      /\.update\((?!.*as any)\s*\{([\s\S]*?)\}\s*\)(?!\s*as)/g,
      '.update({$1} as any)'
    );
    
    // Fix .insert({...}) without as any
    content = content.replace(
      /\.insert\((?!.*as any)\s*\{([\s\S]*?)\}\s*\)(?!\s*as)/g,
      '.insert({$1} as any)'
    );
    
    // Fix .insert([...]) without as any  
    content = content.replace(
      /\.insert\((?!.*as any)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)(?!\s*as)/g,
      '.insert($1 as any)'
    );
    
    // Fix Record<string, X> patterns for update calls
    content = content.replace(
      /Record<string,\s*(string|any)>\s*=/g,
      '{ [key: string]: $1 } ='
    );
    
    writeFileSync(file, content, 'utf-8');
    console.log(`Fixed: ${file}`);
  } catch (e) {
    console.error(`Error: ${file} - ${e.message}`);
  }
}
