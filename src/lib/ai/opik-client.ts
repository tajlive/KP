/**
 * Opik Client - Singleton for LLM observability
 * 
 * Logger alle AI-kall til Opik for tracing og metrics.
 * Prosjekt: klarpakke-ai-signals
 */

import { logger } from '@/lib/logger';

// Dynamisk import av Opik for å unngå zod-konflikt under bygging
let OpikModule: typeof import('opik') | null = null;
let OpikClientInstance: import('opik').Opik | null = null;

async function getOpikModule(): Promise<typeof import('opik') | null> {
  if (OpikModule) return OpikModule;
  
  try {
    OpikModule = await import('opik');
    return OpikModule;
  } catch (error) {
    logger.warn('[Opik] Kunne ikke laste Opik SDK');
    return null;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface OpikTrace {
  id: string;
  name: string;
}

export interface StartTraceInput {
  name: string;
  input?: Record<string, unknown>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EndTraceInput {
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Singleton Opik Client
// ============================================================================

class OpikClient {
  private static instance: OpikClient | null = null;
  private initialized = false;
  private initializing = false;
  private projectName = 'klarpakke-ai-signals';

  private constructor() {}

  public static getInstance(): OpikClient {
    if (!OpikClient.instance) {
      OpikClient.instance = new OpikClient();
    }
    return OpikClient.instance;
  }

  private async initialize(): Promise<void> {
    if (this.initialized || this.initializing) return;
    
    this.initializing = true;
    const apiKey = process.env.OPIK_API_KEY;
    
    if (!apiKey) {
      logger.debug('[Opik] OPIK_API_KEY ikke satt - tracing deaktivert');
      this.initializing = false;
      return;
    }

    try {
      const mod = await getOpikModule();
      if (!mod) {
        this.initializing = false;
        return;
      }

      OpikClientInstance = new mod.Opik({
        apiKey,
        projectName: this.projectName,
      });
      
      this.initialized = true;
      logger.info(`[Opik] Klient initialisert for prosjekt: ${this.projectName}`);
    } catch (error) {
      logger.error('[Opik] Feil ved initialisering:', error);
      this.initialized = false;
    } finally {
      this.initializing = false;
    }
  }

  public isInitialized(): boolean {
    return this.initialized && OpikClientInstance !== null;
  }

  /**
   * Start en ny trace (SYNKRON — for enkel bruk i eksisterende kode)
   * Returnerer traceId som brukes til å avslutte trace senere
   * 
   * MERK: Initialisering skjer lazy/async i bakgrunnen.
   *       Hvis Opik ikke er klar ennå, returneres null (graceful degrade).
   */
  public startTrace(input: StartTraceInput): OpikTrace | null {
    // Lazy initialization (fire-and-forget)
    if (!this.initialized && !this.initializing) {
      this.initialize().catch(() => {});
    }

    // Hvis ikke initialisert ennå, returner null (graceful degrade)
    if (!OpikClientInstance || !this.initialized) {
      return null;
    }

    try {
      const trace = OpikClientInstance.trace({
        name: input.name,
        input: input.input ? JSON.stringify(input.input) : undefined,
        tags: input.tags || [],
        metadata: input.metadata ? JSON.stringify({
          ...input.metadata,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
        }) : undefined,
      });

      // Generer en unik ID for denne tracen
      const traceId = `${input.name}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      return {
        id: traceId,
        name: input.name,
      };
    } catch (error) {
      logger.error('[Opik] Feil ved start av trace:', error);
      return null;
    }
  }

  /**
   * Avslutt en trace med resultat eller feil (SYNKRON)
   */
  public endTrace(
    traceId: string | null,
    input: EndTraceInput
  ): void {
    if (!traceId || !OpikClientInstance || !this.initialized) return;

    try {
      // Trace end - logges via debug (siden Opik SDK logger ved opprettelse)
      logger.debug(`[Opik] Trace ${traceId} avsluttet`, {
        hasOutput: !!input.output,
        hasError: !!input.error,
      });
    } catch (error) {
      logger.error('[Opik] Feil ved avslutting av trace:', error);
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const opik = OpikClient.getInstance();

// ============================================================================
// Convenience wrapper for LLM calls
// ============================================================================

export interface LLMCallParams {
  functionName: string;
  symbol?: string;
  prompt: string;
  marketData?: Record<string, unknown>;
  decisionType?: string;
}

export interface LLMCallResult {
  content: string;
  confidenceScore?: number;
  model?: string;
  provider?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms?: number;
}

/**
 * Wrapper for LLM-kall med Opik tracing
 */
export async function traceLLMCall<T extends LLMCallResult>(
  params: LLMCallParams,
  llmFn: () => Promise<T>
): Promise<T> {
  const tags = ['trading'];
  if (params.symbol) tags.push(params.symbol);
  if (params.decisionType) tags.push(params.decisionType);

  const trace = opik.startTrace({
    name: params.functionName,
    input: {
      prompt: params.prompt,
      symbol: params.symbol,
      marketData: params.marketData,
      decisionType: params.decisionType,
    },
    tags,
  });

  const startTime = Date.now();

  try {
    const result = await llmFn();
    const latencyMs = Date.now() - startTime;

    if (trace) {
      opik.endTrace(trace.id, {
        output: {
          content: result.content.slice(0, 500),
          confidenceScore: result.confidenceScore,
          model: result.model,
          provider: result.provider,
          latency_ms: latencyMs,
        },
        metadata: {
          totalLatencyMs: latencyMs,
          promptTokens: result.usage?.prompt_tokens,
          completionTokens: result.usage?.completion_tokens,
        },
      });
    }

    return result;
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    if (trace) {
      opik.endTrace(trace.id, {
        error: errorObj.message,
        metadata: {
          failedAfterMs: Date.now() - startTime,
        },
      });
    }

    throw error;
  }
}
