import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const authFile = join(__dirname, '../.auth/user.json');

setup('authenticate via API', async ({ page, context }) => {
  const authDir = dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!email || !password || !supabaseUrl || !supabaseAnonKey) {
    console.log('⚠️ Missing E2E credentials or Supabase config, saving empty auth state');
    await context.storageState({ path: authFile });
    return;
  }

  console.log('🔐 Authenticating via Supabase API...');
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    console.log('⚠️ API auth failed:', res.status);
    await context.storageState({ path: authFile });
    return;
  }

  const data = await res.json();
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';

  await page.goto('/no/innlogging', { waitUntil: 'domcontentloaded' });

  // @supabase/ssr reads session from cookies set by the server,
  // but the initial session can be bootstrapped via localStorage
  // which the client-side JS picks up on hydration.
  const storageKey = `sb-${projectRef}-auth-token`;
  await page.evaluate(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
  }, {
    key: storageKey,
    session: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      expires_in: data.expires_in,
      token_type: data.token_type,
      user: data.user,
    },
  });

  // Reload so the Supabase client reads the token from localStorage
  // and sets the proper SSR cookies via the middleware
  await page.reload({ waitUntil: 'networkidle' });

  // Navigate to dashboard to trigger middleware cookie exchange
  await page.goto('/no/dashboard', { waitUntil: 'networkidle', timeout: 30000 });

  // Wait a moment for cookies to settle
  await page.waitForTimeout(2000);

  const finalUrl = page.url();
  const isAuthed = !finalUrl.includes('innlogging') && !finalUrl.includes('login');
  console.log(`✅ Auth complete (authenticated: ${isAuthed}), URL: ${finalUrl}`);
  await context.storageState({ path: authFile });
});
