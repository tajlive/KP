/**
 * providers.ts — KIMI K3 OAuth-konfigurasjon
 *
 * Verifiserer regler fra offisiell Kimi Model Parameter Reference (2026-07):
 * - temperature/top_p/n/penalties er FIKSETE for K3/K2.7 og skal IKKE sendes
 * - reasoning_effort (low/high/max) støttes KUN av k3
 * - Default modell er k3 med effort 'high'
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveKimiModel,
  buildKimiPayload,
  selectBestProvider,
  KIMI_MODELS,
} from '@/lib/ai/providers';

describe('resolveKimiModel', () => {
  it('defaulter til k3 med effort high', () => {
    expect(resolveKimiModel()).toEqual({ model: KIMI_MODELS.K3, reasoningEffort: 'high' });
    expect(resolveKimiModel('k3')).toEqual({ model: KIMI_MODELS.K3, reasoningEffort: 'high' });
    expect(resolveKimiModel('kimi-k3')).toEqual({ model: KIMI_MODELS.K3, reasoningEffort: 'high' });
  });

  it('legacy moonshot-aliasser mappes til k3', () => {
    expect(resolveKimiModel('moonshot-v1-8k').model).toBe(KIMI_MODELS.K3);
    expect(resolveKimiModel('moonshot-v1-128k').model).toBe(KIMI_MODELS.K3);
    expect(resolveKimiModel('kimi-k2-6').model).toBe(KIMI_MODELS.K3);
  });

  it('kimi-for-coding-modeller har IKKE reasoningEffort (støttes ikke av K2.7)', () => {
    const code = resolveKimiModel('kimi-for-coding');
    expect(code.model).toBe(KIMI_MODELS.K2_7_CODE);
    expect(code.reasoningEffort).toBeUndefined();

    const legacy = resolveKimiModel('kimi-k2-7-code');
    expect(legacy.model).toBe(KIMI_MODELS.K2_7_CODE);
    expect(legacy.reasoningEffort).toBeUndefined();

    const highspeed = resolveKimiModel('kimi-for-coding-highspeed');
    expect(highspeed.model).toBe(KIMI_MODELS.K2_7_CODE_HIGHSPEED);
    expect(highspeed.reasoningEffort).toBeUndefined();
  });
});

describe('buildKimiPayload', () => {
  const messages = [{ role: 'user' as const, content: 'Hei' }];

  it('sender ALDRI temperature (fiksert=1.0 hos Kimi, 400-feil ellers)', () => {
    const body = buildKimiPayload(messages, { stream: false });
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('top_p');
    // Selv om caller ber om det — skal ignoreres
    const body2 = buildKimiPayload(messages, { stream: false, temperature: 0.3 });
    expect(body2).not.toHaveProperty('temperature');
  });

  it('k3 får reasoning_effort=high som default, max_tokens=8192 (reasoning-headroom)', () => {
    const body = buildKimiPayload(messages, { stream: false });
    expect(body.model).toBe('k3');
    expect(body.reasoning_effort).toBe('high');
    expect(body.max_tokens).toBe(8192);
    expect(body.stream).toBe(false);
  });

  it('reasoningEffort kan overstyres (low/high/max — aldri medium)', () => {
    expect(buildKimiPayload(messages, { stream: false, reasoningEffort: 'max' }).reasoning_effort).toBe('max');
    expect(buildKimiPayload(messages, { stream: false, reasoningEffort: 'low' }).reasoning_effort).toBe('low');
  });

  it('kimi-for-coding får IKKE reasoning_effort — selv ved eksplisitt override', () => {
    const body = buildKimiPayload(messages, { stream: true, model: 'kimi-for-coding', reasoningEffort: 'high' });
    expect(body.model).toBe('kimi-for-coding');
    expect(body).not.toHaveProperty('reasoning_effort');
    expect(body.stream).toBe(true);
  });

  it('respekterer eksplisitt maxTokens', () => {
    expect(buildKimiPayload(messages, { stream: false, maxTokens: 2048 }).max_tokens).toBe(2048);
  });
});

describe('selectBestProvider (OAuth-only for KIMI)', () => {
  const ENV_KEYS = ['KIMI_OAUTH_TOKEN', 'NVIDIA_API_KEY', 'NVIDIA_NIM_API_KEY', 'MOONSHOT_API_KEY', 'KIMI_API_KEY'];
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('velger kimi når KIMI_OAUTH_TOKEN er satt', () => {
    process.env.KIMI_OAUTH_TOKEN = 'token123';
    expect(selectBestProvider()).toBe('kimi');
    expect(selectBestProvider('auto')).toBe('kimi');
  });

  it('legacy MOONSHOT_API_KEY/KIMI_API_KEY teller IKKE lenger (OAuth-only)', () => {
    process.env.MOONSHOT_API_KEY = 'gammel-nokkel';
    process.env.NVIDIA_API_KEY = 'nv';
    expect(selectBestProvider()).toBe('nvidia');
  });

  it('faller tilbake til nvidia ved foretrukket kimi uten token', () => {
    process.env.NVIDIA_API_KEY = 'nv';
    expect(selectBestProvider('kimi')).toBe('nvidia');
  });

  it('kaster feil uten noen provider-nøkler', () => {
    expect(() => selectBestProvider()).toThrow(/KIMI_OAUTH_TOKEN/);
  });
});
