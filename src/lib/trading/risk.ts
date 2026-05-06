/**
 * Trading Risk Validation
 * 
 * VIKTIG: Dette er den AUTORITATIVE kilden for risiko-validering.
 * Alle trading-operasjoner MÅ gå gjennom disse funksjonene.
 * 
 * Regel: Aldri trade uten validert risk config!
 */

import { createClient } from '@/lib/utils';

export interface TradingRiskConfig {
  user_id: string;
  risk_level: 'low' | 'medium' | 'high';
  max_leverage: number;
  stop_loss_percentage: number;
  take_profit_percentage: number;
  max_position_size_usd: number;
  created_at: string;
  updated_at: string;
}

/**
 * Hent risk config for en bruker
 */
export async function getRiskConfig(userId: string): Promise<TradingRiskConfig | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('trading_risk_config')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error('[Risk] Error fetching risk config:', error);
    return null;
  }
  
  return data as unknown as TradingRiskConfig | null;
}

/**
 * VALIDER risk config før trading
 * 
 * Denne funksjonen MÅ kalles før hver trade!
 * 
 * @throws Error hvis risk config mangler eller er ugyldig
 */
export async function validateRiskConfig(userId: string): Promise<TradingRiskConfig> {
  const config = await getRiskConfig(userId);
  
  if (!config) {
    throw new Error(
      `ABORT: No trading_risk_config found for user ${userId}. ` +
      'User must configure risk settings before trading.'
    );
  }
  
  // Validate max_leverage
  if (!config.max_leverage || config.max_leverage < 1 || config.max_leverage > 10) {
    throw new Error(
      `ABORT: Invalid max_leverage (${config.max_leverage}) for user ${userId}. ` +
      'Must be between 1 and 10.'
    );
  }
  
  // Validate risk_level
  if (!['low', 'medium', 'high'].includes(config.risk_level)) {
    throw new Error(
      `ABORT: Invalid risk_level (${config.risk_level}) for user ${userId}.` +
      'Must be low, medium, or high.'
    );
  }
  
  // Validate max_position_size_usd
  if (!config.max_position_size_usd || config.max_position_size_usd <= 0) {
    throw new Error(
      `ABORT: Invalid max_position_size_usd (${config.max_position_size_usd}) for user ${userId}.` +
      'Must be greater than 0.'
    );
  }
  return config;
}

/**
 * Beregn tillatt position size basert på risk config
 */
export function calculatePositionSize(
  config: TradingRiskConfig,
  accountBalance: number,
  currentPrice: number
): { quantity: number; valueUsd: number } {
  // Maksimalt 10% av balance per trade for LOW risk
  // Maksimalt 20% av balance per trade for MEDIUM risk
  // Maksimalt 30% av balance per trade for HIGH risk
  const balancePercent = {
    low: 0.1,
    medium: 0.2,
    high: 0.3,
  }[config.risk_level];
  
  const maxValueFromBalance = accountBalance * balancePercent;
  const maxValueFromConfig = config.max_position_size_usd;
  
  // Bruk den LAVESTE av de to
  const valueUsd = Math.min(maxValueFromBalance, maxValueFromConfig);
  const quantity = currentPrice > 0 ? valueUsd / currentPrice : 0;
  
  return { quantity, valueUsd };
}

/**
 * Sjekk om bruker har tillatelse til å trade
 */
export async function canTrade(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  config?: TradingRiskConfig;
}> {
  try {
    const config = await validateRiskConfig(userId);
    return { allowed: true, config };
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Opprett default risk config for ny bruker
 */
export async function createDefaultRiskConfig(userId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('trading_risk_config')
    .insert({
      user_id: userId,
      risk_level: 'low',
      max_leverage: 2,
      stop_loss_percentage: 5,
      take_profit_percentage: 10,
      max_position_size_usd: 1000,
    } as never);
  
  if (error) {
    console.error('[Risk] Error creating default risk config:', error);
    throw error;
  }
}
