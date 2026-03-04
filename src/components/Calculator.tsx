'use client';

import React, { useState, useCallback } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Label } from './ui';

interface CalculatorResults {
  positionSize: number;
  riskAmount: number;
  riskRewardRatio: number;
}

export function Calculator() {
  const [balance, setBalance] = useState<string>('10000');
  const [riskPercent, setRiskPercent] = useState<string>('1');
  const [entry, setEntry] = useState<string>('');
  const [stoploss, setStoploss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [results, setResults] = useState<CalculatorResults | null>(null);
  const [error, setError] = useState<string>('');

  const calculate = useCallback(() => {
    setError('');
    setResults(null);

    const balanceNum = parseFloat(balance);
    const riskPercentNum = parseFloat(riskPercent);
    const entryNum = parseFloat(entry);
    const stoplossNum = parseFloat(stoploss);
    const takeProfitNum = takeProfit ? parseFloat(takeProfit) : null;

    if (isNaN(balanceNum) || balanceNum <= 0) {
      setError('Vennligst oppgi en gyldig saldo');
      return;
    }

    if (isNaN(riskPercentNum) || riskPercentNum <= 0 || riskPercentNum > 100) {
      setError('Risikoprosent må være mellom 0 og 100');
      return;
    }

    if (isNaN(entryNum) || entryNum <= 0) {
      setError('Vennligst oppgi en gyldig inngangspris');
      return;
    }

    if (isNaN(stoplossNum) || stoplossNum <= 0) {
      setError('Vennligst oppgi en gyldig stop loss');
      return;
    }

    if (entryNum === stoplossNum) {
      setError('Inngang og stop loss kan ikke være like');
      return;
    }

    const riskAmount = (balanceNum * riskPercentNum) / 100;
    const priceDiff = Math.abs(entryNum - stoplossNum);
    const positionSize = riskAmount / priceDiff;

    let riskRewardRatio = 0;
    if (takeProfitNum && !isNaN(takeProfitNum)) {
      const profitDiff = Math.abs(takeProfitNum - entryNum);
      riskRewardRatio = profitDiff / priceDiff;
    }

    setResults({
      positionSize,
      riskAmount,
      riskRewardRatio,
    });
  }, [balance, riskPercent, entry, stoploss, takeProfit]);

  const formatNumber = (num: number, decimals = 2) => {
    return new Intl.NumberFormat('nb-NO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  return (
    <div id="calculator-container" className="kp-max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Posisjonskalkulator</CardTitle>
          <CardDescription>Beregn optimal posisjonsstørrelse basert på risiko</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="kp-form">
            <Input
              id="calc-balance"
             
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="10000"
              min="0"
              step="100"
              required
            />

            <Input
              id="calc-risk-percent"
             
              type="number"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              placeholder="1"
              min="0.1"
              max="100"
              step="0.1"
             
              required
            />

            <Input
              id="calc-entry"
             
              type="number"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="100.00"
              min="0"
              step="0.01"
              required
            />

            <Input
              id="calc-stoploss"
             
              type="number"
              value={stoploss}
              onChange={(e) => setStoploss(e.target.value)}
              placeholder="95.00"
              min="0"
              step="0.01"
              required
            />

            <Input
              id="calc-takeprofit"
             
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="110.00"
              min="0"
              step="0.01"
             
            />

            {error && (
              <div className="kp-alert kp-alert-error">
                <div className="kp-alert-content">
                  <div className="kp-alert-message">{error}</div>
                </div>
              </div>
            )}

            <div className="kp-form-actions">
              <Button
                id="calc-button"
                variant="primary"
                onClick={calculate}
                className="kp-w-full"
              >
                Beregn posisjon
              </Button>
            </div>
          </div>

          {results && (
            <div id="calc-results" className="kp-mt-6">
              <hr className="kp-divider" />
              <h4 className="kp-text-lg kp-font-semibold kp-mb-4">Resultater</h4>

              <div className="kp-flex kp-flex-col kp-gap-4">
                <div className="kp-card" style={{ padding: 'var(--kp-space-4)' }}>
                  <div className="kp-text-sm kp-text-secondary">Posisjonsstørrelse</div>
                  <div id="calc-result-size" className="kp-text-2xl kp-font-bold kp-text-primary">
                    {formatNumber(results.positionSize, 4)} enheter
                  </div>
                </div>

                <div className="kp-card" style={{ padding: 'var(--kp-space-4)' }}>
                  <div className="kp-text-sm kp-text-secondary">Risikobeløp</div>
                  <div id="calc-result-risk" className="kp-text-2xl kp-font-bold" style={{ color: 'var(--kp-error)' }}>
                    {formatNumber(results.riskAmount)} NOK
                  </div>
                </div>

                {results.riskRewardRatio > 0 && (
                  <div className="kp-card" style={{ padding: 'var(--kp-space-4)' }}>
                    <div className="kp-text-sm kp-text-secondary">Risk/Reward Ratio</div>
                    <div
                      id="calc-result-rr"
                      className="kp-text-2xl kp-font-bold"
                      style={{ color: results.riskRewardRatio >= 2 ? 'var(--kp-success)' : 'var(--kp-warning)' }}
                    >
                      1:{formatNumber(results.riskRewardRatio, 1)}
                    </div>
                    <div className="kp-text-xs kp-text-muted kp-mt-2">
                      {results.riskRewardRatio >= 2
                        ? 'God risk/reward ratio'
                        : 'Vurder høyere take profit for bedre R:R'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Calculator;
