/* eslint-env node */
const fs = require('fs');
const execSync = require('child_process').execSync;

const out = execSync('grep -rl "createClient()" src/app/api | xargs grep -l "getUser" || true').toString();
const files = out.split('\n').filter(Boolean);

for (const file of files) {
  if (file.includes('/cron/') || file.includes('.test.')) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('@/lib/supabase/server')) {
    // Modify imports
    content = content.replace(/import\s+\{([^}]*)(createClient)([^}]*)\}\s+from\s+["']@\/lib\/supabase\/server["']/g, (match, p1, p2, p3) => {
        if (!p1.includes('createServerClient') && !p3.includes('createServerClient')) {
             return `import { ${p1.trim()} createServerClient ${p3.trim()} } from "@/lib/supabase/server"`.replace(/\s+/g, ' ');
        }
        return match;
    });

    content = content.replace(/await\s+createClient\(\)/g, 'await createServerClient()');
    
    content = content.replace(/import\s*\{\s*createServerClient\s*\}\s*from\s*["']@\/lib\/supabase\/server["']/, 'import { createServerClient } from "@/lib/supabase/server"');
    
    content = content.replace(/import \{ createClient \} from/g, 'import { createServerClient } from');
    
    fs.writeFileSync(file, content);
    // eslint-disable-next-line no-undef
    console.log('Fixed', file);
  }
}
