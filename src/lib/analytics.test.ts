import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { track, type AnalyticsEvent } from './analytics';

describe('Analytics Event Contract', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    
    global.window = {
      plausible: vi.fn(),
      location: { href: 'https://test.klarpakke.no/dashboard' },
    } as unknown as any;
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should track onboarding_viewed event with correct structure', () => {
    const event: AnalyticsEvent = { name: 'onboarding_viewed' };
    track(event);
    
    expect(global.window.plausible).toHaveBeenCalledWith('onboarding_viewed', { props: undefined });
  });

  it('should track checkout_started with required props', () => {
    const event: AnalyticsEvent = { 
      name: 'checkout_started', 
      props: { plan: 'master', price_id: 'price_123' } 
    };
    track(event);
    
    expect(global.window.plausible).toHaveBeenCalledWith('checkout_started', {
      props: { plan: 'master', price_id: 'price_123' },
    });
  });

  it('should track trade_confirmed with numeric amount', () => {
    const event: AnalyticsEvent = {
      name: 'trade_confirmed',
      props: { symbol: 'BTC', direction: 'BUY', amount: 0.5 },
    };
    track(event);
    
    expect(global.window.plausible).toHaveBeenCalledWith('trade_confirmed', {
      props: { symbol: 'BTC', direction: 'BUY', amount: 0.5 },
    });
  });

  it('should dedupe rapid identical events', () => {
    const event: AnalyticsEvent = { name: 'onboarding_viewed' };
    
    track(event);
    track(event);
    track(event);
    
    // Should only be called once due to deduping
    expect(global.window.plausible).toHaveBeenCalledTimes(1);
  });

  it('should allow different events in rapid succession', () => {
    track({ name: 'onboarding_viewed' });
    track({ name: 'pricing_viewed' });
    track({ name: 'dashboard_viewed' });
    
    expect(global.window.plausible).toHaveBeenCalledTimes(3);
  });

  it('should send to internal endpoint', () => {
    const event: AnalyticsEvent = { name: 'test_event', props: { foo: 'bar' } };
    track(event);
    
    expect(fetchSpy).toHaveBeenCalledWith('/api/analytics', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('test_event'),
    }));
  });

  it('should include timestamp and URL in payload', () => {
    track({ name: 'test_event' });
    
    const [, call] = fetchSpy.mock.calls;
    if (!call) return;
    
    const body = JSON.parse(call.body as string);
    expect(body.timestamp).toBeDefined();
    expect(body.url).toBe('https://test.klarpakke.no/dashboard');
  });
});

describe('Analytics Error Handling', () => {
  it('should not throw if fetch fails', () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    
    expect(() => {
      track({ name: 'test_event' });
    }).not.toThrow();
  });

  it('should not throw if plausible is undefined', () => {
    global.window = {} as unknown as any;
    
    expect(() => {
      track({ name: 'test_event' });
    }).not.toThrow();
  });

  it('should truncate error messages to 100 chars', () => {
    const longMessage = 'a'.repeat(200);
    
    track({ name: 'error', props: { context: 'test', message: longMessage } });
    
    expect(global.window.plausible).toHaveBeenCalledWith('error', {
      props: { context: 'test', message: 'a'.repeat(100) },
    });
  });
});
