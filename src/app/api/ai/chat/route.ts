/**
 * Unified AI Chat API - Smart Provider Routing
 * 
 * Støtter:
 * 1. KIMI K3 via Global API / OAuth (primær for komplekse oppgaver)
 * 2. DeepSeek V4 (billig fallback for enkle oppgaver)
 * 3. Perplexity PRO (websearch / fallback)
 * 4. NVIDIA NIM (fallback)
 * 
 * Smart ruting:
 * - 'simple'     → DeepSeek V4 Flash (billigst)
 * - 'complex'    → Kimi K2.7 Code
 * - 'architecture' → Kimi K3 (reasoning max)
 * - 'websearch'  → Perplexity PRO
 * 
 * Endepunkter:
 * POST /api/ai/chat - Send melding til AI
 * GET /api/ai/chat?path=providers - List tilgjengelige providere
 * 
 * Miljøvariabler:
 * - KIMI_API_KEY eller KIMI_OAUTH_TOKEN (for KIMI)
 * - DEEPSEEK_API_KEY (for DeepSeek)
 * - PERPLEXITY_API_KEY (for websearch / fallback)
 * - NVIDIA_API_KEY eller NVIDIA_NIM_API_KEY (for NVIDIA)
 */

import { NextResponse } from 'next/server';
import { createServerClient } from "@/lib/supabase/server";
import {
  chatWithKimi,
  chatWithDeepSeek,
  streamKimiResponse,
  streamDeepSeekResponse,
  getAvailableProviders,
  SYSTEM_PROMPTS,
  selectProviderPlan,
  type AIProvider,
  type ChatProvider,
  type AIMessage,
  type ProviderPlan,
} from '@/lib/ai/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Perplexity PRO modeller
const PERPLEXITY_MODELS = {
  PRO: 'sonar-pro',
  REASONING: 'sonar-reasoning',
  DEEP_RESEARCH: 'sonar-deep-research',
  STANDARD: 'sonar',
} as const;

// ==================== PERPLEXITY IMPLEMENTATION ====================

async function chatWithPerplexity(
  messages: AIMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    systemPrompt?: string;
  } = {}
): Promise<Response> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY er ikke satt');
  }

  const {
    model = PERPLEXITY_MODELS.PRO,
    temperature = 0.7,
    maxTokens = 2000,
    stream = false,
    systemPrompt = SYSTEM_PROMPTS.CRYPTO_EXPERT,
  } = options;

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: maxTokens,
      temperature,
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
  }

  return response;
}

// ==================== PROVIDER EXECUTORS ====================

async function executePlan(
  plan: ProviderPlan,
  messages: AIMessage[],
  systemPrompt: string | undefined,
  temperature: number,
  maxTokens: number,
): Promise<{ content: string; provider: ChatProvider; model: string; usage?: unknown; latency_ms?: number }> {
  const msgs = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...messages.filter(m => m.role !== 'system')]
    : messages;

  switch (plan.provider) {
    case 'kimi':
      const kimiResp = await chatWithKimi(msgs, {
        model: plan.model,
        reasoningEffort: plan.reasoningEffort,
        temperature,
        maxTokens,
      });
      return {
        content: kimiResp.content,
        provider: 'kimi',
        model: kimiResp.model,
        usage: kimiResp.usage,
        latency_ms: kimiResp.latency_ms,
      };

    case 'deepseek':
      const dsResp = await chatWithDeepSeek(msgs, {
        model: plan.model,
        temperature,
        maxTokens,
      });
      return {
        content: dsResp.content,
        provider: 'deepseek',
        model: dsResp.model,
        usage: dsResp.usage,
        latency_ms: dsResp.latency_ms,
      };

    case 'perplexity': {
      const resp = await chatWithPerplexity(msgs, {
        model: plan.model,
        temperature,
        maxTokens,
        stream: false,
        systemPrompt,
      });
      const data = await resp.json();
      return {
        content: data.choices[0]?.message?.content || '',
        provider: 'perplexity',
        model: data.model,
        usage: data.usage,
      };
    }

    default:
      throw new Error(`Provider ${plan.provider} støttes ikke av smart-ruting ennå`);
  }
}

async function* executePlanStream(
  plan: ProviderPlan,
  messages: AIMessage[],
  systemPrompt: string | undefined,
  temperature: number,
  maxTokens: number,
): AsyncGenerator<{ content?: string; done: boolean; error?: string }, void, unknown> {
  const msgs = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...messages.filter(m => m.role !== 'system')]
    : messages;

  try {
    switch (plan.provider) {
      case 'kimi':
        yield* streamKimiResponse(msgs, {
          model: plan.model,
          reasoningEffort: plan.reasoningEffort,
          temperature,
          maxTokens,
        });
        return;

      case 'deepseek':
        yield* streamDeepSeekResponse(msgs, {
          model: plan.model,
          temperature,
          maxTokens,
        });
        return;

      default:
        throw new Error(`Streaming støttes ikke for ${plan.provider} ennå`);
    }
  } catch (err) {
    yield { error: err instanceof Error ? err.message : String(err), done: true };
  }
}

// ==================== POST /api/ai/chat ====================

interface ChatRequest {
  messages: AIMessage[];
  provider?: AIProvider | 'perplexity';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
  useCase?: 'crypto' | 'trading' | 'market' | 'general';
  forceProvider?: AIProvider | 'perplexity' | 'auto';
  websearch?: boolean;
}

export async function POST(req: Request) {
  try {
    // Auth — krever innlogget Supabase-bruker
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Du må være logget inn for å bruke AI-chat' },
        { status: 401 }
      );
    }

    const body: ChatRequest = await req.json();
    const {
      messages,
      temperature = 0.3,
      maxTokens = 8192,
      stream = false,
      systemPrompt,
      useCase = 'general',
      forceProvider = 'auto',
      websearch = false,
    } = body;

    // Validering
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Meldinger er påkrevd og må være et array' },
        { status: 400 }
      );
    }

    // Velg system prompt basert på use case
    let finalSystemPrompt = systemPrompt;
    if (!finalSystemPrompt) {
      switch (useCase) {
        case 'crypto':
          finalSystemPrompt = SYSTEM_PROMPTS.CRYPTO_EXPERT;
          break;
        case 'trading':
          finalSystemPrompt = SYSTEM_PROMPTS.TRADING_ASSISTANT;
          break;
        case 'market':
          finalSystemPrompt = SYSTEM_PROMPTS.MARKET_ANALYST;
          break;
      }
    }

    // Bygg plan basert på oppgave + tilgjengelige providere
    const plans = selectProviderPlan(messages, forceProvider, websearch);

    if (plans.length === 0) {
      return NextResponse.json(
        { error: 'Ingen AI provider konfigurert for denne oppgaven' },
        { status: 503 }
      );
    }

    // ==================== STREAMING ====================
    if (stream) {
      const encoder = new TextEncoder();
      
      const streamGenerator = new ReadableStream({
        async start(controller) {
          for (const plan of plans) {
            try {
              let hasError = false;
              for await (const chunk of executePlanStream(plan, messages, finalSystemPrompt, temperature, maxTokens)) {
                if (chunk.error) {
                  hasError = true;
                  // Prøv neste plan ved initieringsfeil
                  break;
                }
                const data = JSON.stringify({
                  content: chunk.content ?? '',
                  done: chunk.done,
                  provider: plan.provider,
                  model: plan.model,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                if (chunk.done) {
                  controller.close();
                  return;
                }
              }
              if (!hasError) {
                controller.close();
                return;
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              // Hvis det er siste plan, returner feil; ellers prøv neste
              if (plan === plans[plans.length - 1]) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`
                  )
                );
                controller.close();
                return;
              }
            }
          }
          controller.close();
        },
      });

      return new Response(streamGenerator, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // ==================== NON-STREAMING med fallback ====================
    const errors: { provider: ChatProvider; error: string }[] = [];

    for (const plan of plans) {
      try {
        const result = await executePlan(plan, messages, finalSystemPrompt, temperature, maxTokens);
        return NextResponse.json({
          content: result.content,
          provider: result.provider,
          model: result.model,
          usage: result.usage,
          latency_ms: result.latency_ms,
          routing: {
            tier: plan.tier,
            tried: errors.map(e => e.provider),
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ provider: plan.provider, error: errorMessage });
        console.warn(`AI routing fallback: ${plan.provider} feilet (${errorMessage})`);
      }
    }

    // Alle planer feilet
    return NextResponse.json(
      {
        error: 'Alle tilgjengelige AI-providere feilet',
        failures: errors,
      },
      { status: 502 }
    );

  } catch (error) {
    console.error('AI Chat API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Kunne ikke prosessere forespørselen',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// ==================== GET /api/ai/chat ====================

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const providers = await getAvailableProviders();
  const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;

  // GET /api/ai/chat?path=providers - List tilgjengelige providere
  if (path === 'providers') {
    return NextResponse.json({
      primary: 'kimi',
      websearchFallback: 'perplexity',
      cheapFallback: 'deepseek',
      providers: {
        kimi: {
          available: providers.some((p) => p.provider === 'kimi' && p.available),
          priority: 1,
          models: providers.find((p) => p.provider === 'kimi')?.models || [],
          recommended: 'complex / architecture',
          defaultModel: 'kimi-for-coding',
        },
        deepseek: {
          available: providers.some((p) => p.provider === 'deepseek' && p.available),
          priority: 2,
          models: providers.find((p) => p.provider === 'deepseek')?.models || [],
          recommended: 'simple / cheap fallback',
        },
        perplexity: {
          available: hasPerplexity,
          priority: 3,
          models: Object.values(PERPLEXITY_MODELS),
          recommended: 'websearch',
        },
        ...providers
          .filter((p) => p.provider !== 'kimi' && p.provider !== 'deepseek')
          .reduce<Record<string, { provider: AIProvider; available: boolean; models: string[] }>>(
            (acc, p) => ({ ...acc, [p.provider]: p }),
            {}
          ),
      },
      systemPrompts: Object.keys(SYSTEM_PROMPTS),
    });
  }

  // Default: Returner API-info
  return NextResponse.json({
    name: 'Klarpakke AI Chat API - Smart Provider Routing',
    version: '3.1.0',
    primaryProvider: 'kimi',
    cheapProvider: 'deepseek',
    defaultModel: 'kimi-for-coding',
    perplexityStatus: hasPerplexity ? 'Konfigurert (websearch fallback)' : 'Ikke konfigurert',
    endpoints: {
      POST: '/api/ai/chat - Send melding til AI',
      'GET /api/ai/chat?path=providers': 'List tilgjengelige providere og modeller',
    },
    supportedProviders: ['kimi', 'deepseek', 'perplexity', 'nvidia'],
    kimiModels: providers.find((p) => p.provider === 'kimi')?.models || [],
    deepseekModels: providers.find((p) => p.provider === 'deepseek')?.models || [],
    perplexityModels: Object.values(PERPLEXITY_MODELS),
    useCases: ['crypto', 'trading', 'market', 'general'],
    features: [
      'streaming',
      'non-streaming',
      'citations',
      'auto-provider-selection',
      'websearch-fallback',
      'smart-task-routing',
      'provider-fallback-on-error',
    ],
  });
}
