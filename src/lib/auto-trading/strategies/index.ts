/**
 * Strategy Factory
 * Creates appropriate strategy instance based on configuration
 */

import type { AutoTradingStrategy, UserAutoTradingConfig, StrategyType } from '../types'
import { BaseStrategy } from './base-strategy'
import { ConservativeStrategy } from './conservative-strategy'
import { BalancedStrategy } from './balanced-strategy'
import { AggressiveStrategy } from './aggressive-strategy'
import { CustomStrategy } from './custom-strategy'
import { GridStrategy, type GridConfig } from './grid-strategy'
import { DCAStrategy, type DCAConfig } from './dca-strategy'

export { BaseStrategy } from './base-strategy'
export { ConservativeStrategy } from './conservative-strategy'
export { BalancedStrategy } from './balanced-strategy'
export { AggressiveStrategy } from './aggressive-strategy'
export { CustomStrategy } from './custom-strategy'
export { GridStrategy, type GridConfig } from './grid-strategy'
export { DCAStrategy, type DCAConfig } from './dca-strategy'

export interface StrategyCreationParams {
  strategy: AutoTradingStrategy
  config?: UserAutoTradingConfig
  strategyType?: StrategyType
  gridConfig?: GridConfig
  dcaConfig?: DCAConfig
  capital?: number
}

export function createStrategy(params: StrategyCreationParams): BaseStrategy {
  const { strategy, config, strategyType, gridConfig, dcaConfig, capital } = params

  // Determine strategy type from config or default to trend
  const type = strategyType || config?.custom_params?.strategyType || 'trend'

  switch (type) {
    case 'grid': {
      const gridCfg = gridConfig || GridStrategy.getGridConfig(strategy.risk_level)
      return new GridStrategy(strategy, gridCfg)
    }

    case 'dca': {
      const dcaCfg = dcaConfig || DCAStrategy.getDCAConfig(strategy.risk_level, capital || 100000)
      return new DCAStrategy(strategy, dcaCfg)
    }

    case 'trend':
    case 'momentum':
    default: {
      // Original trend-based strategies
      switch (strategy.risk_level) {
        case 'conservative':
          return new ConservativeStrategy(strategy)

        case 'balanced':
          return new BalancedStrategy(strategy)

        case 'aggressive':
          return new AggressiveStrategy(strategy)

        case 'custom':
          if (!config) {
            throw new Error('Custom strategy requires user config')
          }
          return new CustomStrategy(strategy, config)

        default:
          throw new Error(`Unknown strategy risk level: ${strategy.risk_level}`)
      }
    }
  }
}

/**
 * Get available strategy types with descriptions
 */
export function getStrategyTypes(): Array<{
  type: StrategyType
  name: string
  description: string
  bestFor: string
  riskLevels: string[]
}> {
  return [
    {
      type: 'trend',
      name: 'Trend Following',
      description: 'Følger markedsretningen. Kjøper i uptrends, selger i downtrends.',
      bestFor: 'Bull markets og sterke trender',
      riskLevels: ['conservative', 'balanced', 'aggressive', 'custom']
    },
    {
      type: 'grid',
      name: 'Grid Trading',
      description: 'Kjøper og selger på faste intervaller innenfor et prisområde.',
      bestFor: 'Sidelengs markeder med volatilitet',
      riskLevels: ['conservative', 'balanced', 'aggressive']
    },
    {
      type: 'dca',
      name: 'Smart DCA',
      description: 'Dollar Cost Averaging med intelligent timing. Kjøper mer når prisen faller.',
      bestFor: 'Langsiktig akkumulering',
      riskLevels: ['conservative', 'balanced', 'aggressive']
    },
    {
      type: 'momentum',
      name: 'Momentum',
      description: 'Handler basert på prisbevegelse og momentum-indikatorer.',
      bestFor: 'Korte til mellomlangsiktige trender',
      riskLevels: ['balanced', 'aggressive']
    }
  ]
}
