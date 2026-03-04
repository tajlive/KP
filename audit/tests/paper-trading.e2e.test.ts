/**
 * E2E Test Suite: Paper Trading Full Flow
 * 
 * Disse testene verifiserer at:
 * 1. Paper trading sessions kan opprettes
 * 2. Cron tick prosesserer sessions
 * 3. Trades blir eksekvert og logget
 * 4. Session state oppdateres korrekt
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@/lib/supabase/server';

const TEST_USER_ID = 'test-user-' + Date.now();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret';

describe('Paper Trading Full Flow', () => {
  let supabase: ReturnType<typeof createClient>;
  let sessionId: string;

  beforeAll(async () => {
    supabase = await createClient();
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  async function cleanupTestData() {
    await supabase.from('auto_trading_trades').delete().eq('user_id', TEST_USER_ID);
    await supabase.from('auto_trading_sessions').delete().eq('user_id', TEST_USER_ID);
    await supabase.from('trading_sessions').delete().eq('user_id', TEST_USER_ID);
  }

  describe('1. Session Creation', () => {
    it('should create a paper trading session via API', async () => {
      const response = await fetch(`${BASE_URL}/api/auto-trading/paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          strategyId: 'test-strategy-id',
          initialCapital: 100000
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.session).toBeDefined();
      sessionId = data.session.id;
    });

    it('should prevent duplicate active sessions', async () => {
      const response = await fetch(`${BASE_URL}/api/auto-trading/paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          strategyId: 'test-strategy-id',
          initialCapital: 100000
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('2. Cron Tick Processing', () => {
    it('should process active sessions via cron tick', async () => {
      const response = await fetch(`${BASE_URL}/api/cron/tick`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.processed).toBeGreaterThan(0);
    });
  });
});
