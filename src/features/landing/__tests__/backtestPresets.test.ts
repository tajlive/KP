/**
 * Tester for backtestPresets
 * 
 * Validerer:
 * - ALLE presets har pess < exp < opt
 * - Conservative har lavere drawdown enn aggressive
 * - getPreset returnerer korrekt for edge-cases
 * - Ingen preset returnerer undefined
 */

import { describe, it, expect } from 'vitest';
import {
  BACKTEST_PRESETS,
  getPreset,
  getPresetsForProfile,
  validatePresets,
  type RiskProfile,
} from '../backtestPresets';

describe('BACKTEST_PRESETS', () => {
  describe('Validering av verdikonsistens', () => {
    it('skal ha pessimistic < expected < optimistic for alle presets', () => {
      for (const preset of BACKTEST_PRESETS) {
        expect(
          preset.pessimisticReturn,
          `${preset.riskProfile}/${preset.months}: pessimistic skal være < expected`
        ).toBeLessThan(preset.expectedReturn);
        
        expect(
          preset.expectedReturn,
          `${preset.riskProfile}/${preset.months}: expected skal være < optimistic`
        ).toBeLessThan(preset.optimisticReturn);
      }
    });

    it('skal ha negativ maxDrawdown for alle presets', () => {
      for (const preset of BACKTEST_PRESETS) {
        expect(
          preset.maxDrawdown,
          `${preset.riskProfile}/${preset.months}: maxDrawdown skal være negativ`
        ).toBeLessThan(0);
      }
    });

    it('skal ha positiv volatilitet for alle presets', () => {
      for (const preset of BACKTEST_PRESETS) {
        expect(
          preset.volatility,
          `${preset.riskProfile}/${preset.months}: volatilitet skal være positiv`
        ).toBeGreaterThan(0);
      }
    });
  });

  describe('Risk profile hierarki', () => {
    it('conservative skal ha lavere drawdown enn balanced', () => {
      const conservative = BACKTEST_PRESETS.find(
        p => p.riskProfile === 'conservative' && p.months === 12
      );
      const balanced = BACKTEST_PRESETS.find(
        p => p.riskProfile === 'balanced' && p.months === 12
      );

      expect(conservative).toBeDefined();
      expect(balanced).toBeDefined();
      expect(conservative!.maxDrawdown).toBeGreaterThan(balanced!.maxDrawdown); // -0.18 > -0.28
    });

    it('balanced skal ha lavere drawdown enn aggressive', () => {
      const balanced = BACKTEST_PRESETS.find(
        p => p.riskProfile === 'balanced' && p.months === 12
      );
      const aggressive = BACKTEST_PRESETS.find(
        p => p.riskProfile === 'aggressive' && p.months === 12
      );

      expect(balanced).toBeDefined();
      expect(aggressive).toBeDefined();
      expect(balanced!.maxDrawdown).toBeGreaterThan(aggressive!.maxDrawdown); // -0.28 > -0.40
    });

    it('conservative skal ha lavere volatilitet enn aggressive', () => {
      const conservative = BACKTEST_PRESETS.find(
        p => p.riskProfile === 'conservative' && p.months === 12
      );
      const aggressive = BACKTEST_PRESETS.find(
        p => p.riskProfile === 'aggressive' && p.months === 12
      );

      expect(conservative).toBeDefined();
      expect(aggressive).toBeDefined();
      expect(conservative!.volatility).toBeLessThan(aggressive!.volatility);
    });
  });

  describe('getPreset', () => {
    it('skal returnere korrekt preset for eksakte måneder', () => {
      const preset = getPreset('balanced', 12);
      expect(preset).toBeDefined();
      expect(preset!.months).toBe(12);
      expect(preset!.riskProfile).toBe('balanced');
    });

    it('skal runde opp til nærmeste gyldige måneder', () => {
      const preset4 = getPreset('balanced', 4);
      expect(preset4).toBeDefined();
      expect(preset4!.months).toBe(6); // runder opp fra 4 til 6

      const preset9 = getPreset('balanced', 9);
      expect(preset9).toBeDefined();
      expect(preset9!.months).toBe(12); // runder opp fra 9 til 12
    });

    it('skal returnere 36-måneders for months > 36', () => {
      const preset = getPreset('balanced', 48);
      expect(preset).toBeDefined();
      expect(preset!.months).toBe(36);
    });

    it('skal returnere 3-måneders for months = 1', () => {
      const preset = getPreset('balanced', 1);
      expect(preset).toBeDefined();
      expect(preset!.months).toBe(3);
    });

    it('skal returnere undefined for ugyldig riskProfile', () => {
      const preset = getPreset('invalid' as RiskProfile, 12);
      expect(preset).toBeUndefined();
    });
  });

  describe('getPresetsForProfile', () => {
    it('skal returnere alle presets for conservative', () => {
      const presets = getPresetsForProfile('conservative');
      expect(presets).toHaveLength(5);
      expect(presets.every(p => p.riskProfile === 'conservative')).toBe(true);
    });

    it('skal returnere alle presets for balanced', () => {
      const presets = getPresetsForProfile('balanced');
      expect(presets).toHaveLength(5);
      expect(presets.every(p => p.riskProfile === 'balanced')).toBe(true);
    });

    it('skal returnere alle presets for aggressive', () => {
      const presets = getPresetsForProfile('aggressive');
      expect(presets).toHaveLength(5);
      expect(presets.every(p => p.riskProfile === 'aggressive')).toBe(true);
    });
  });

  describe('validatePresets', () => {
    it('skal ikke kaste error for gyldige presets', () => {
      expect(() => validatePresets()).not.toThrow();
    });
  });

  describe('Data kompletthet', () => {
    it('skal ha 15 presets totalt (3 profiles × 5 periods)', () => {
      expect(BACKTEST_PRESETS).toHaveLength(15);
    });

    it('skal ha alle påkrevde felter for hver preset', () => {
      for (const preset of BACKTEST_PRESETS) {
        expect(preset.riskProfile).toBeDefined();
        expect(preset.months).toBeDefined();
        expect(preset.pessimisticReturn).toBeDefined();
        expect(preset.expectedReturn).toBeDefined();
        expect(preset.optimisticReturn).toBeDefined();
        expect(preset.maxDrawdown).toBeDefined();
        expect(preset.volatility).toBeDefined();
        expect(preset.strategyLabel).toBeDefined();
        expect(preset.asset).toBeDefined();
      }
    });
  });
});
