-- Legg til GRID i backtest_results strategy-constraint
-- Grid-backtest-pipeline (walk-forward sweep) lagrer strategy='grid'

ALTER TABLE backtest_results DROP CONSTRAINT IF EXISTS backtest_results_strategy_check;
ALTER TABLE backtest_results ADD CONSTRAINT backtest_results_strategy_check
  CHECK (strategy = ANY (ARRAY['SMA_CROSSOVER','RSI_MEAN_REVERSION','AI_SIGNALS','GRID']));
