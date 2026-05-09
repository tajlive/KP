export * from './types';
export { trendAgent } from './trend-agent';
export { meanReversionAgent } from './mean-reversion-agent';
export { breakoutAgent } from './breakout-agent';
export { volatilityAgent } from './volatility-agent';
export { momentumAgent } from './momentum-agent';
export { volumeAgent } from './volume-agent';
export { hurstAgent } from './hurst-agent';
export { gridAgent } from './grid-agent';
export { sentimentAgent } from './sentiment-agent';

import type { TradingAgent } from './types';
import { trendAgent } from './trend-agent';
import { meanReversionAgent } from './mean-reversion-agent';
import { breakoutAgent } from './breakout-agent';
import { volatilityAgent } from './volatility-agent';
import { momentumAgent } from './momentum-agent';
import { volumeAgent } from './volume-agent';
import { hurstAgent } from './hurst-agent';
import { gridAgent } from './grid-agent';
import { sentimentAgent } from './sentiment-agent';

export const DEFAULT_AGENTS: TradingAgent[] = [
  trendAgent,
  meanReversionAgent,
  breakoutAgent,
  volatilityAgent,
  momentumAgent,
  volumeAgent,
  hurstAgent,
  gridAgent,
  sentimentAgent,
];
