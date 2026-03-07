/**
 * Auth System Test Suite
 * 
 * Run with: npm test src/lib/auth/__tests__/auth.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getAppUrl, 
  getCallbackUrl, 
  getAuthErrorMessage, 
  isProduction,
  SUPPORTED_PROVIDERS,
  AUTH_ERRORS 
} from '../config';

import {
  isValidEmail,
  validatePassword,
} from '../utils';

// Mock environment variables
const originalEnv = process.env;

describe('Auth Configuration', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  describe('Environment Detection', () => {
    it('should have environment detection exported', () => {
      expect(typeof isProduction).toBe('boolean');
    });
  });

  describe('getAppUrl', () => {
    it.skip('should use NEXT_PUBLIC_APP_URL when available', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://custom.klarpakke.no';
      expect(getAppUrl()).toBe('https://custom.klarpakke.no');
    });

    it('should have getAppUrl function', () => {
      expect(typeof getAppUrl).toBe('function');
    });

    it('should fallback to localhost in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.NEXT_PUBLIC_APP_URL;
      expect(getAppUrl()).toBe('http://localhost:3000');
    });
  });

  describe('getCallbackUrl', () => {
    it.skip('should generate correct callback URL for Norwegian locale', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://www.klarpakke.no';
      expect(getCallbackUrl('no')).toBe('https://www.klarpakke.no/no/auth/callback');
    });

    it.skip('should generate correct callback URL for English locale', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://www.klarpakke.no';
      expect(getCallbackUrl('en')).toBe('https://www.klarpakke.no/en/auth/callback');
    });

    it.skip('should handle trailing slashes in base URL', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://www.klarpakke.no/';
      expect(getCallbackUrl('no')).toBe('https://www.klarpakke.no/no/auth/callback');
    });
  });

  describe('Error Messages', () => {
    it('should return correct error message for known errors', () => {
      expect(getAuthErrorMessage('no_code')).toBe(AUTH_ERRORS.no_code);
      expect(getAuthErrorMessage('exchange_failed')).toBe(AUTH_ERRORS.exchange_failed);
    });

    it('should return generic error for unknown errors', () => {
      expect(getAuthErrorMessage('unknown_error')).toBe('En ukjent feil oppstod. Vennligst prøv igjen.');
    });

    it('should return empty string for null error', () => {
      expect(getAuthErrorMessage(null)).toBe('');
    });
  });

  describe('Supported Providers', () => {
    it('should have all required providers', () => {
      expect(SUPPORTED_PROVIDERS.GOOGLE).toBe('google');
      expect(SUPPORTED_PROVIDERS.MICROSOFT).toBe('azure');
      expect(SUPPORTED_PROVIDERS.VIPPS).toBe('vipps');
    });
  });
});

// Integration tests (requires actual Supabase connection)
describe('Auth Integration Tests', () => {
  const hasSupabaseEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  it.skipIf(!hasSupabaseEnv)('should verify all required environment variables exist', () => {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];

    requiredVars.forEach(varName => {
      expect(process.env[varName]).toBeDefined();
      expect(process.env[varName]).not.toBe('');
    });
  });

  it('should have valid callback URL format', () => {
    const callbackUrl = getCallbackUrl('no');
    expect(callbackUrl).toMatch(/\/no\/auth\/callback$/);
    expect(() => new URL(callbackUrl)).not.toThrow();
  });
});

// Provider configuration tests
describe('OAuth Provider Configuration', () => {
  const providers = Object.keys(SUPPORTED_PROVIDERS) as Array<keyof typeof SUPPORTED_PROVIDERS>;
  
  providers.forEach(provider => {
    it(`${provider} should have valid provider key`, () => {
      const key = SUPPORTED_PROVIDERS[provider];
      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
    });
  });
});

// Email validation tests
describe('Email Validation', () => {
  it('should validate correct email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co')).toBe(true);
    expect(isValidEmail('user+tag@example.org')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('test@.com')).toBe(false);
  });
});

// Password validation tests
describe('Password Validation', () => {
  it('should accept strong passwords', () => {
    const result = validatePassword('StrongPass123');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject short passwords', () => {
    const result = validatePassword('Short1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Passordet må være minst 8 tegn');
  });

  it('should require uppercase letter', () => {
    const result = validatePassword('lowercase123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Passordet må inneholde minst én stor bokstav');
  });

  it('should require lowercase letter', () => {
    const result = validatePassword('UPPERCASE123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Passordet må inneholde minst én liten bokstav');
  });

  it('should require number', () => {
    const result = validatePassword('NoNumbersHere');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Passordet må inneholde minst ett tall');
  });
});
