/**
 * TRIAL MANAGER
 * Håndterer 14-dagers auto-trading trial for gratis-brukere
 * Automatisk start ved første besøk til /dashboard/auto-trade
 */

import { createClient } from '../supabase/server';
import { TIERS } from '../pricing/tiers';

export interface TrialStatus {
  isActive: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  startedAt: Date | null;
  expiresAt: Date | null;
  canUseLiveTrading: boolean;
  message?: string;
  urgency?: 'none' | 'warning' | 'critical'; // For UI alerts
}

/**
 * Hent trial-status for bruker
 * Auto-starter trial hvis ikke startet
 */
export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  const supabase = createClient();
  
  // 1. Hent user profile
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('created_at, subscription_tier, trial_started_at, trial_expires_at')
    .eq('id', userId)
    .single();
  
  if (error || !profile) {
    return {
      isActive: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      startedAt: null,
      expiresAt: null,
      canUseLiveTrading: false,
      message: 'Kunne ikke hente trial-status',
      urgency: 'none',
    };
  }
  
  const profileExt = profile as any as { subscription_tier?: string; tier?: string; trial_started_at?: string; trial_expires_at?: string };
  const tier = TIERS[(profileExt.subscription_tier ?? profileExt.tier) as keyof typeof TIERS];
  
  // 2. Hvis betalt tier → ingen trial nødvendig
  if (tier.liveTrading && tier.priceNOK > 0) {
    return {
      isActive: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      startedAt: null,
      expiresAt: null,
      canUseLiveTrading: true,
      message: 'Du har betalt abonnement med full tilgang',
      urgency: 'none',
    };
  }
  
  // 3. Sjekk om trial er startet
  if (!profileExt.trial_started_at) {
    // Auto-start trial
    return await startTrial(userId);
  }
  
  // 4. Sjekk om trial er utløpt
  const now = new Date();
  const expiresAt = new Date(profileExt.trial_expires_at ?? 0);
  const startedAt = new Date(profileExt.trial_started_at ?? 0);
  const isExpired = now > expiresAt;
  
  if (isExpired) {
    return {
      isActive: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      startedAt,
      expiresAt,
      canUseLiveTrading: false,
      message: 'Trial utløpt. Oppgrader til Bachelor for live trading.',
      urgency: 'critical',
    };
  }
  
  // 5. Trial aktiv → beregn remaining time
  const msRemaining = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
  
  // Urgency level
  let urgency: TrialStatus['urgency'] = 'none';
  if (daysRemaining <= 1) {
    urgency = 'critical'; // < 24 timer
  } else if (daysRemaining <= 3) {
    urgency = 'warning';  // 1-3 dager
  }
  
  return {
    isActive: true,
    daysRemaining,
    hoursRemaining,
    startedAt,
    expiresAt,
    canUseLiveTrading: true,
    message: `${daysRemaining} ${daysRemaining === 1 ? 'dag' : 'dager'} igjen av trial`,
    urgency,
  };
}

/**
 * Start 14-dagers trial
 * Kalles automatisk ved første besøk til auto-trade
 */
async function startTrial(userId: string): Promise<TrialStatus> {
  const supabase = createClient();
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 dager
  
  // Oppdater profile (trial-felter kan mangle i generert type)
  const { error } = await supabase
    .from('user_profiles')
    .update({
      trial_started_at: now.toISOString(),
      trial_expires_at: expiresAt.toISOString(),
    } as any)
    .eq('id', userId);
  
  if (error) {
    console.error('Failed to start trial:', error);
    return {
      isActive: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      startedAt: null,
      expiresAt: null,
      canUseLiveTrading: false,
      message: 'Kunne ikke starte trial',
      urgency: 'none',
    };
  }
  
  // Log trial start event (for analytics)
  try {
    await supabase.from('events').insert({
      user_id: userId,
      event_type: 'trial_started',
      event_data: { trial_days: 14, expires_at: expiresAt.toISOString() },
    } as any);
  } catch (logError) {
    console.error('Failed to log trial start:', logError);
  }
  
  return {
    isActive: true,
    daysRemaining: 14,
    hoursRemaining: 14 * 24,
    startedAt: now,
    expiresAt,
    canUseLiveTrading: true,
    message: '🎉 14-dagers trial startet! Test alle funksjoner gratis.',
    urgency: 'none',
  };
}

/**
 * Sjekk om bruker kan opprette live strategy
 */
export async function canCreateLiveStrategy(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const trialStatus = await getTrialStatus(userId);
  
  if (trialStatus.canUseLiveTrading) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: trialStatus.message || 'Live trading krever betalt abonnement eller aktiv trial',
  };
}
