/**
 * ConfluentSignalCard Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ConfluentSignalCard,
  ConfluentSignalCardSkeleton,
} from '../ConfluentSignalCard';
import type { ConfluentSignal } from '@/lib/trading/confluent-signal-engine';

// Mock feature flags
const mockUseFeatureFlag = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  useFeatureFlag: (flag: string) => mockUseFeatureFlag(flag),
}));

// Mock fetch
global.fetch = vi.fn();

const mockSignal: ConfluentSignal = {
  action: 'BUY',
  reason: 'SMA crossover detected',
  score: 75,
  riskLevel: 3,
  factors: {
    trend: 0.8,
    volatility: 0.4,
    ai_signal: 0.75,
    narrative_sentiment: 0.5,
    event_risk: 0.2,
    market_regime: 'bull',
  },
  metadata: {
    narrativeData: {
      symbol: 'BTC',
      sentiment: 0.5,
      event_risk: 0.2,
      key_events: [],
      reasoning_excerpt: 'Positive sentiment',
      sources: [],
    },
    regimeData: {
      regime: 'bull',
      confidence: 0.8,
      reasoning_excerpt: 'Uptrend',
      risk_flags: [],
      sources: [],
    },
    usedFallback: false,
  },
};

describe('ConfluentSignalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with Sonar UI enabled', () => {
    beforeEach(() => {
      mockUseFeatureFlag.mockReturnValue(true);
    });

    it('renders signal with AI badges', () => {
      render(<ConfluentSignalCard signal={mockSignal} symbol="BTC" />);

      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('Kjøp')).toBeInTheDocument();
      expect(screen.getByText('75/100')).toBeInTheDocument();
      expect(screen.getByText('AI-analysert')).toBeInTheDocument();
    });

    it('shows explanation button when Sonar is enabled', () => {
      render(<ConfluentSignalCard signal={mockSignal} symbol="BTC" />);

      expect(
        screen.getByRole('button', { name: /Hvorfor dette signalet/i })
      ).toBeInTheDocument();
    });

    it('shows AI factors when expanded', () => {
      render(<ConfluentSignalCard signal={mockSignal} symbol="BTC" />);

      // Click to expand factors
      fireEvent.click(screen.getByText(/Nøkkelfaktorer/i));

      // Check that AI factors are visible
      expect(screen.getByText('Sentiment:')).toBeInTheDocument();
      expect(screen.getByText('Hendelsesrisiko:')).toBeInTheDocument();
      expect(screen.getByText('Markedsregime:')).toBeInTheDocument();
    });

    it('opens explanation dialog when button clicked', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            title: 'Test Explanation',
            summary: 'Test summary',
            key_points: ['Point 1'],
            risk_warnings: ['Warning 1'],
            sources: [],
          }),
      } as any as Response);

      render(<ConfluentSignalCard signal={mockSignal} symbol="BTC" />);

      fireEvent.click(
        screen.getByRole('button', { name: /Hvorfor dette signalet/i })
      );

      await waitFor(() => {
        expect(screen.getByText('Test Explanation')).toBeInTheDocument();
      });
    });

    it('shows fallback badge when fallback was used', () => {
      const fallbackSignal: ConfluentSignal = {
        ...mockSignal,
        metadata: { ...mockSignal.metadata, usedFallback: true },
      };

      render(<ConfluentSignalCard signal={fallbackSignal} symbol="BTC" />);

      expect(screen.getByText('Fallback')).toBeInTheDocument();
    });

    it('hides AI badges when no AI factors present', () => {
      const technicalSignal: ConfluentSignal = {
        ...mockSignal,
        factors: {
          trend: 0.8,
          volatility: 0.4,
          ai_signal: 0.75,
          // No AI factors
        },
      };

      render(<ConfluentSignalCard signal={technicalSignal} symbol="BTC" />);

      expect(screen.queryByText('AI-analysert')).not.toBeInTheDocument();
    });
  });

  describe('with Sonar UI disabled', () => {
    beforeEach(() => {
      mockUseFeatureFlag.mockReturnValue(false);
    });

    it('renders signal without AI badges', () => {
      render(<ConfluentSignalCard signal={mockSignal} symbol="BTC" />);

      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.queryByText('AI-analysert')).not.toBeInTheDocument();
    });

    it('hides explanation button when Sonar is disabled', () => {
      render(<ConfluentSignalCard signal={mockSignal} symbol="BTC" />);

      expect(
        screen.queryByRole('button', { name: /Hvorfor dette signalet/i })
      ).not.toBeInTheDocument();
    });

    it('hides AI factors in expanded view', () => {
      render(<ConfluentSignalCard signal={mockSignal} symbol="BTC" />);

      fireEvent.click(screen.getByText(/Nøkkelfaktorer/i));

      // Technical factors should be visible
      expect(screen.getByText('Trend:')).toBeInTheDocument();

      // AI factors should NOT be visible
      expect(screen.queryByText('Sentiment:')).not.toBeInTheDocument();
      expect(screen.queryByText('Hendelsesrisiko:')).not.toBeInTheDocument();
    });
  });

  describe('score rendering', () => {
    beforeEach(() => {
      mockUseFeatureFlag.mockReturnValue(true);
    });

    it('renders correct decision label for strong buy', () => {
      const strongBuySignal: ConfluentSignal = { ...mockSignal, score: 85 };
      render(<ConfluentSignalCard signal={strongBuySignal} symbol="BTC" />);

      expect(screen.getByText('Sterkt kjøp')).toBeInTheDocument();
    });

    it('renders correct decision label for sell', () => {
      const sellSignal: ConfluentSignal = { ...mockSignal, score: 30 };
      render(<ConfluentSignalCard signal={sellSignal} symbol="BTC" />);

      expect(screen.getByText('Salg')).toBeInTheDocument();
    });

    it('renders correct decision label for hold', () => {
      const holdSignal: ConfluentSignal = { ...mockSignal, score: 50 };
      render(<ConfluentSignalCard signal={holdSignal} symbol="BTC" />);

      expect(screen.getByText('Hold')).toBeInTheDocument();
    });
  });

  describe('risk level display', () => {
    beforeEach(() => {
      mockUseFeatureFlag.mockReturnValue(true);
    });

    it('shows correct risk level label', () => {
      render(<ConfluentSignalCard signal={mockSignal} symbol="BTC" />);

      fireEvent.click(screen.getByText(/Nøkkelfaktorer/i));

      expect(screen.getByText('3/5 (Middels)')).toBeInTheDocument();
    });
  });
});

describe('ConfluentSignalCardSkeleton', () => {
  it('renders skeleton elements', () => {
    render(<ConfluentSignalCardSkeleton />);

    // Should have skeleton elements with skeleton-shimmer class
    const skeletons = document.querySelectorAll('.skeleton-shimmer');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
