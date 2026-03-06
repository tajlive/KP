import { Page, BrowserContext } from '@playwright/test';

/**
 * Mock Authentication Helper
 * 
 * Bruker session-cookies for å simulere innlogging uten å
 * faktisk gå gjennom login-flow.
 * 
 * Dette er raskere og mer pålitelig for E2E-tester.
 */

export interface MockUser {
  id: string;
  email: string;
  full_name: string;
}

// Standard test-bruker
export const MOCK_USER: MockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@klarpakke.no',
  full_name: 'Test User',
};

/**
 * Simulerer innlogging ved å sette Supabase session-cookies
 * 
 * Bruk: await mockLogin(page, context);
 */
export async function mockLogin(
  page: Page, 
  context: BrowserContext, 
  user: MockUser = MOCK_USER
) {
  // Lag en mock-session
  const mockSession = {
    access_token: 'mock-access-token-' + Date.now(),
    refresh_token: 'mock-refresh-token-' + Date.now(),
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name: user.full_name,
      },
      aud: 'authenticated',
      role: 'authenticated',
    },
  };

  // Sett cookies for Supabase auth
  await context.addCookies([
    {
      name: 'sb-access-token',
      value: mockSession.access_token,
      domain: new URL(page.url()).hostname,
      path: '/',
      httpOnly: false,
      secure: false,
    },
    {
      name: 'sb-refresh-token',
      value: mockSession.refresh_token,
      domain: new URL(page.url()).hostname,
      path: '/',
      httpOnly: false,
      secure: false,
    },
  ]);

  // Inject session i localStorage (Supabase bruker dette)
  await page.evaluate((session) => {
    localStorage.setItem('sb-auth-token', JSON.stringify(session));
    // Trigg auth state change event
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'sb-auth-token',
      newValue: JSON.stringify(session),
    }));
  }, mockSession);

  console.log('✅ Mock login completed for:', user.email);
}

/**
 * Sjekk om bruker er "logget inn" (har mock session)
 */
export async function isMockLoggedIn(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => {
    return localStorage.getItem('sb-auth-token');
  });
  return !!token;
}

/**
 * Logg ut (fjern mock session)
 */
export async function mockLogout(page: Page, context: BrowserContext) {
  await page.evaluate(() => {
    localStorage.removeItem('sb-auth-token');
  });
  
  await context.clearCookies();
  
  console.log('✅ Mock logout completed');
}
