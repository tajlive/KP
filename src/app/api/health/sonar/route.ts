/**
 * GET /api/health/sonar
 * Health check endpoint for Sonar integration
 * Checks configuration and basic connectivity
 */

import { NextResponse } from 'next/server';
import {
  isSonarIntegrationEnabled,
  getEffectiveSonarTier,
} from '@/lib/ai/sonar/feature-flags';
import { checkSonarHealth } from '@/lib/ai/sonar';
import { checkConfluentEngineHealth } from '@/lib/trading/confluent-signal-engine';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  sonar: {
    enabled: boolean;
    tier: 'sonar' | 'sonar-pro';
    apiKeyConfigured: boolean;
    apiHealthy: boolean;
  };
  confluentEngine: {
    healthy: boolean;
    factors: {
      technical: boolean;
      narrative: boolean;
      regime: boolean;
    };
  } | null;
  errors?: string[];
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const timestamp = new Date().toISOString();
  const errors: string[] = [];

  try {
    // Check Sonar configuration
    const sonarEnabled = isSonarIntegrationEnabled();
    const sonarTier = getEffectiveSonarTier();

    // Check if API key is configured
    const apiKeyConfigured = !!process.env.PERPLEXITY_API_KEY;

    // Check basic API health (only if enabled)
    let apiHealthy = false;
    if (sonarEnabled) {
      try {
        const health = await checkSonarHealth();
        apiHealthy = health.healthy;
      } catch (error) {
        logger.warn('[Health] Sonar API health check failed:', error);
        errors.push('Sonar API health check failed');
      }
    }

    // Check Confluent Engine health (only if Sonar enabled)
    let confluentHealth = null;
    if (sonarEnabled) {
      try {
        const engineHealth = await checkConfluentEngineHealth();
        confluentHealth = {
          healthy: engineHealth.healthy,
          factors: engineHealth.factors,
        };
      } catch (error) {
        logger.warn('[Health] Confluent engine health check failed:', error);
        errors.push('Confluent engine health check failed');
      }
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!sonarEnabled) {
      // Sonar is disabled - this is a valid state
      status = 'healthy';
    } else if (!apiKeyConfigured) {
      status = 'unhealthy';
      errors.push('PERPLEXITY_API_KEY not configured');
    } else if (!apiHealthy) {
      status = 'unhealthy';
    } else if (confluentHealth && !confluentHealth.healthy) {
      status = 'degraded';
    }

    const response: HealthResponse = {
      status,
      timestamp,
      sonar: {
        enabled: sonarEnabled,
        tier: sonarTier,
        apiKeyConfigured,
        apiHealthy,
      },
      confluentEngine: confluentHealth,
      ...(errors.length > 0 && { errors }),
    };

    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('[Health] Unexpected error during health check:', error);

    const response: HealthResponse = {
      status: 'unhealthy',
      timestamp,
      sonar: {
        enabled: false,
        tier: 'sonar',
        apiKeyConfigured: false,
        apiHealthy: false,
      },
      confluentEngine: null,
      errors: [
        error instanceof Error ? error.message : 'Unknown error during health check',
      ],
    };

    return NextResponse.json(response, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}
