/**
 * Unified AI Chat API - Perplexity PRO Edition
 * 
 * Støtter:
 * 1. Perplexity PRO (primær)
 * 2. KIMI (Moonshot) 
 * 3. NVIDIA NIM
 * 
 * Endepunkter:
 * POST /api/ai/chat - Send melding til AI
 * GET /api/ai/chat?path=providers - List tilgjengelige providere
 * 
 * Miljøvariabler:
 * - PERPLEXITY_API_KEY (påkrevd for Perplexity PRO)
 * - MOONSHOT_API_KEY eller KIMI_API_KEY (for KIMI)
 * - NVIDIA_API_KEY eller NVIDIA_NIM_API_KEY (for NVIDIA)
 */

import { NextResponse } from 'next/server';
import {
  chatWithAI,
  streamAIResponse,
  getAvailableProviders,
  SYSTEM_PROMPTS,
  type AIProvider,
  type AIMessage,
  KIMI_MODELS,
  NVIDIA_MODELS,
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
  forceProvider?: 'perplexity' | 'kimi' | 'nvidia' | 'auto';
}

export async function POST(req: Request) {
  try {
    const body: ChatRequest = await req.json();
    const {
      messages,
      temperature = 0.7,
      maxTokens = 2000,
      stream = false,
      systemPrompt,
      useCase = 'general',
      forceProvider = 'auto',
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

    // Sjekk hvilke providere som er tilgjengelige
    const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
    const hasKimi = !!(process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY);
    const hasNvidia = !!(process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY);

    // Velg provider
    let usePerplexity = hasPerplexity;
    let useKimi = false;
    let useNvidia = false;

    if (forceProvider === 'perplexity') {
      usePerplexity = hasPerplexity;
      if (!hasPerplexity) {
        return NextResponse.json(
          { error: 'Perplexity er ikke konfigurert. Sett PERPLEXITY_API_KEY.' },
          { status: 503 }
        );
      }
    } else if (forceProvider === 'kimi') {
      usePerplexity = false;
      useKimi = hasKimi;
      if (!hasKimi) {
        return NextResponse.json(
          { error: 'KIMI er ikke konfigurert. Sett MOONSHOT_API_KEY.' },
          { status: 503 }
        );
      }
    } else if (forceProvider === 'nvidia') {
      usePerplexity = false;
      useNvidia = hasNvidia;
      if (!hasNvidia) {
        return NextResponse.json(
          { error: 'NVIDIA er ikke konfigurert. Sett NVIDIA_API_KEY.' },
          { status: 503 }
        );
      }
    } else {
      // Auto-select: Perplexity -> KIMI -> NVIDIA
      useKimi = !hasPerplexity && hasKimi;
      useNvidia = !hasPerplexity && !hasKimi && hasNvidia;
    }

    // ==================== PERPLEXITY PRO ====================
    if (usePerplexity) {
      console.info("Using Perplexity PRO");
      
      const response = await chatWithPerplexity(messages, {
        model: body.model || PERPLEXITY_MODELS.PRO,
        temperature,
        maxTokens,
        stream,
        systemPrompt: finalSystemPrompt,
      });

      if (stream) {
        return new Response(response.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }

      const data = await response.json();
      
      return NextResponse.json({
        content: data.choices[0]?.message?.content || '',
        provider: 'perplexity',
        model: data.model,
        usage: data.usage,
        citations: data.citations || [],
      });
    }

    // ==================== KIMI / NVIDIA ====================
    const provider = useKimi ? 'kimi' : useNvidia ? 'nvidia' : null;
    
    if (!provider) {
      return NextResponse.json(
        { 
          error: 'Ingen AI provider konfigurert',
          message: 'Sett PERPLEXITY_API_KEY, MOONSHOT_API_KEY eller NVIDIA_API_KEY',
          setup: {
            perplexity: { url: 'https://perplexity.ai/', recommended: true },
            kimi: 'https://platform.moonshot.cn/',
            nvidia: 'https://build.nvidia.com/',
          }
        },
        { status: 503 }
      );
    }

    // STREAMING for KIMI/NVIDIA
    if (stream) {
      const encoder = new TextEncoder();
      
      const streamGenerator = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamAIResponse({
              provider,
              temperature,
              maxTokens,
              systemPrompt: finalSystemPrompt,
              messages,
            })) {
              const data = JSON.stringify({
                content: chunk.content,
                done: chunk.done,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              
              if (chunk.done) {
                controller.close();
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`
              )
            );
            controller.close();
          }
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

    // NON-STREAMING for KIMI/NVIDIA
    const response = await chatWithAI({
      provider,
      temperature,
      maxTokens,
      systemPrompt: finalSystemPrompt,
      messages,
    });

    return NextResponse.json({
      content: response.content,
      provider: response.provider,
      model: response.model,
      usage: response.usage,
      latency_ms: response.latency_ms,
    });

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

  // GET /api/ai/chat?path=providers - List tilgjengelige providere
  if (path === 'providers') {
    const providers = getAvailableProviders();
    const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;

    return NextResponse.json({
      primary: 'perplexity',
      providers: {
        perplexity: {
          available: hasPerplexity,
          priority: 1,
          models: Object.values(PERPLEXITY_MODELS),
          recommended: true,
        },
        ...providers.reduce((acc, p) => ({ ...acc, [p.provider]: p }), {}),
      },
      systemPrompts: Object.keys(SYSTEM_PROMPTS),
    });
  }

  // Default: Returner API-info
  const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
  
  return NextResponse.json({
    name: 'Klarpakke AI Chat API - Perplexity PRO Edition',
    version: '1.0.0',
    primaryProvider: 'perplexity',
    perplexityStatus: hasPerplexity ? '✅ Konfigurert' : '❌ Ikke konfigurert',
    endpoints: {
      POST: '/api/ai/chat - Send melding til AI',
      'GET /api/ai/chat?path=providers': 'List tilgjengelige providere og modeller',
    },
    supportedProviders: ['perplexity', 'kimi', 'nvidia'],
    perplexityModels: Object.values(PERPLEXITY_MODELS),
    useCases: ['crypto', 'trading', 'market', 'general'],
    features: ['streaming', 'non-streaming', 'citations', 'auto-provider-selection'],
  });
}
