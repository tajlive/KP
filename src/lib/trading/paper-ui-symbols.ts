/**
 * Canonical symbols brukt i papir-handel UI (TradingInterface + BotWizard).
 * Risk-validering for mode=paper unioner dette med brukerens risk_profiles.allowed_pairs
 * slik at demo-handler ikke blokkeres når UI tilbyr mynten.
 */
export const PAPER_TRADING_UI_SYMBOLS: readonly string[] = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "DOTUSDT",
  "LINKUSDT",
  "DOGEUSDT",
];
