/**
 * Unified AI Providers Service
 * 
 * Støtter:
 * - KIMI (Moonshot AI) - https://platform.moonshot.cn/
 * - NVIDIA NIM - https://build.nvidia.com/
 * 
 * Bruk:
 * ```typescript
 * const response = await chatWithAI({
 *   provider: 'kimi',
 *   messages: [{ role: 'user', content: 'Hei!' }]
 * });
 * ```
 */

// Opik er deaktivert i prod — for stor for Cloudflare Workers (37 MB+)
// Bruk dynamisk import kun i utvikling
const opik: unknown = { track: () => {} };

// Placeholder trace function — Opik is conditionally loaded
const traceLLMCall = <T>(
  _params: { functionName: string; prompt: string },
  llmFn: () => Promise<T>,
): Promise<T> => llmFn();

// ==================== TYPES ====================

export type AIProvider = 'kimi' | 'nvidia' | 'auto';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms?: number;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
}

export interface AIOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

// ==================== KIMI (MOONSHOT) CONFIG ====================

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

function resolveKimiModel(modelOrAlias?: string): {
  model: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
} {
  const alias = modelOrAlias?.trim().toLowerCase();

  if (alias === 'kimi-for-coding' || alias === KIMI_MODELS.HIGH.toLowerCase()) {
    return { model: KIMI_MODELS.HIGH, reasoningEffort: 'high' };
  }

  if (alias === KIMI_MODELS.REASONING.toLowerCase()) {
    return { model: KIMI_MODELS.REASONING, reasoningEffort: 'high' };
  }

  // Default to highest-capability model
  return { model: KIMI_MODELS.HIGH, reasoningEffort: 'high' };
}

export const KIMI_MODELS = {
  SMALL: 'moonshot-v1-8k',
  MEDIUM: 'moonshot-v1-32k',
  LARGE: 'moonshot-v1-128k',
  REASONING: 'kimi-k2-6',
  HIGH: 'kimi-k2-7-code',
} as const;

export type KimiModel = typeof KIMI_MODELS[keyof typeof KIMI_MODELS];

interface KimiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface KimiStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

async function getKimiAuthHeader(): Promise<Record<string, string>> {
  const apiKey = process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY;
  if (!apiKey) {
    throw new Error('MOONSHOT_API_KEY eller KIMI_API_KEY må være satt i miljøvariabler');
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

// ==================== NVIDIA NIM CONFIG ====================

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export const NVIDIA_MODELS = {
  LLAMA_3_1_405B: 'meta/llama-3.1-405b-instruct',
  LLAMA_3_1_70B: 'meta/llama-3.1-70b-instruct',
  LLAMA_3_1_8B: 'meta/llama-3.1-8b-instruct',
  MISTRAL_LARGE: 'nvidia/mistral-large-2-instruct',
  NEMOTRON_4: 'nvidia/nemotron-4-340b-instruct',
} as const;

export type NvidiaModel = typeof NVIDIA_MODELS[keyof typeof NVIDIA_MODELS];

interface NvidiaResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface NvidiaStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

// ==================== SYSTEM PROMPTS ====================

export const SYSTEM_PROMPTS = {
  CRYPTO_EXPERT: `Du er "Professor Kimi" - den offisielle AI-professoren for Klarpakke Universitet. Du er en kunnskapsrik, tålmodig og pedagogisk mentor som hjelper brukere med ALT relatert til Klarpakke og kryptovaluta.

## DIN EKSPERTISE

### 1. Kryptovaluta & Blockchain (Grunnleggende til avansert)
- Kryptovaluta: Bitcoin, Ethereum, Solana, altcoins, stablecoins
- Blockchain-teknologi: Hvordan det fungerer, konsensusmekanismer, smart contracts
- Wallet-sikkerhet: Private keys, seed phrases, hardware wallets
- DeFi: Staking, yield farming, liquidity pools, DEX
- NFTs: Minting, trading, bruksområder

### 2. Trading & Investering (Utdanning, ikke rådgivning)
- Teknisk analyse: Candlesticks, support/resistance, trender, indikatorer (RSI, MACD, MA)
- Fundamental analyse: Tokenomics, whitepapers, prosjektvurdering
- Risikostyring: Stop-loss, posisjonsstørrelse, diversifisering
- Trading-psykologi: FOMO, FUD, disiplin, trading-plan
- Ordretyper: Market, limit, stop-loss, OCO

### 3. Klarpakke Plattformen (Komplett guide)
- Registrering og komme i gang
- Kurs og akademi: Hvordan navigere, fullføre kurs, få sertifiseringer
- Paper Trading: Simulering, virtuelle penger, øve uten risiko
- Auto-Trading Robot: Hvordan aktivere, risikonivåer (10%/20%/40%), strategier
- Binance-kobling: API-nøkler, sikkerhet, tilkoblingsguide
- Copy Trading: Følg suksessfulle tradere, leaderboard
- Dashboard: Oversikt over portefølje, handler, statistikk
- Priser og abonnement: Student (gratis), Bachelor, Master, PhD, Professor

### 4. Praktisk Bruk
- Hvordan sette inn penger (via Binance)
- Hvordan ta ut penger
- Hvordan lese markedsoversikt
- Hvordan bruke kalkulatoren
- Hvordan delta på konkurranser

### 5. Teknisk Support
- Innlogging og passord
- To-faktor-autentisering (2FA)
- E-postvarsler og push-notifikasjoner
- Mobil-app (PWA) installasjon
- Feilsøking av vanlige problemer

## VIKTIGE REGLER

- **ALLTID NORSK**: Svar alltid på norsk (bokmål)
- **PEDAGOGISK**: Vær tålmodig, forklar trinnvis, bruk eksempler
- **OPPMUNTERENDE**: Bygg selvtillit, feiring fremgang
- **RISIKOVARSEL**: Inkluder alltid advarsel ved trading/investeringsspørsmål
- **IKKE FINANSIELL RÅDGIVNING**: Presiser at dette er utdanning, ikke personlig rådgivning
- **KILDER**: Henvis til Klarpakkes funksjoner når relevant

## OM KLARPAKKE (Alltid inkluder i relevante svar)

Klarpakke Universitet er Norges ledende plattform for kryptovaluta-utdanning:
- 📚 Strukturerte kurs fra nybegynner til avansert
- 🎮 Paper trading for risikofri øving
- 🤖 Auto-trading med Binance-integrasjon
- 🏆 Konkurranser og leaderboard
- 👥 Copy-trading community

**VIKTIG**: Brukeren beholder ALLTID pengene på sin egen Binance-konto. Roboten sender kun kjøps-/salgsordre via API-nøkler. Brukeren kan skru av roboten når som helst.

## HVORDAN DU SVARER

1. **Forstå spørsmålet**: Er det om krypto generelt, trading, eller Klarpakke-spesifikt?
2. **Gi kontekst**: Forklar "hvorfor" ikke bare "hvordan"
3. **Trinnvise instruksjoner**: Ved "hvordan"-spørsmål, gi nummererte steg
4. **Visuelle referanser**: Henvis til UI-elementer i Klarpakke når relevant
5. **Oppsummer**: Avslutt med et motiverende tips eller neste steg`,

  MARKET_ANALYST: `Du er Professor Kimi, markedsanalytiker for Klarpakke Universitet. 

Analyser kryptomarkedet på norsk:
- Gi faktabasert innsikt
- Vær objektiv og profesjonell
- Inkluder alltid risikoadvarsel
- Hold analysen konsis (maks 3-4 setninger)
- Henvis til aktuelle priser og trender

Husk: Dette er utdanning, ikke investeringsråd.`,

  TRADING_ASSISTANT: `Du er Professor Kimi, trading-mentor for Klarpakke-brukere.

Hjelp med:
- Å forstå ordretyper (limit, market, stop-loss)
- Risikokalkulasjoner og posisjonsstørrelse
- Porteføljefordeling og diversifisering
- Tekniske indikatorer og strategier
- Paper trading øvelser
- Auto-trading robot konfigurasjon

Aldri gi kjøps- eller salgsanbefalinger.
Bruk alltid norsk. Vær pedagogisk og oppmuntrende.`,
} as const;

// ==================== KIMI IMPLEMENTATION ====================

async function chatWithKimiInternal(
  messages: AIMessage[],
  options: AIOptions = {}
): Promise<AIResponse> {
  const startTime = Date.now();
  const headers = await getKimiAuthHeader();
  const { model, reasoningEffort } = resolveKimiModel(options.model || KIMI_MODELS.HIGH);
  const temperature = options.temperature ?? 0.3;
  const maxTokens = options.maxTokens || 4096;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };
  if (reasoningEffort) {
    body.reasoning_effort = reasoningEffort;
  }

  const response = await fetch(KIMI_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`KIMI API error: ${response.status} - ${error}`);
  }

  const data: KimiResponse = await response.json();
  const latency_ms = Date.now() - startTime;

  return {
    content: data.choices[0]?.message?.content || '',
    provider: 'kimi',
    model: data.model,
    usage: data.usage,
    latency_ms,
  };
}

async function chatWithKimi(
  messages: AIMessage[],
  options: AIOptions = {}
): Promise<AIResponse> {
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  return traceLLMCall(
    {
      functionName: 'chatWithKimi',
      prompt: lastMessage,
    },
    () => chatWithKimiInternal(messages, options)
  );
}

async function* streamKimiResponse(
  messages: AIMessage[],
  options: AIOptions = {}
): AsyncGenerator<AIStreamChunk, void, unknown> {
  const headers = await getKimiAuthHeader();
  const { model, reasoningEffort } = resolveKimiModel(options.model || KIMI_MODELS.HIGH);
  const temperature = options.temperature ?? 0.3;
  const maxTokens = options.maxTokens || 4096;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };
  if (reasoningEffort) {
    body.reasoning_effort = reasoningEffort;
  }

  const response = await fetch(KIMI_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`KIMI API error: ${response.status} - ${error}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        yield { content: '', done: true };
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true };
            return;
          }

          try {
            const parsed: KimiStreamChunk = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              yield { content, done: false };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ==================== NVIDIA NIM IMPLEMENTATION ====================

async function chatWithNvidiaInternal(
  messages: AIMessage[],
  options: AIOptions = {}
): Promise<AIResponse> {
  const startTime = Date.now();
  const apiKey = process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY;
  
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY eller NVIDIA_NIM_API_KEY må være satt i miljøvariabler');
  }

  const model = options.model || NVIDIA_MODELS.LLAMA_3_1_70B;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens || 2048;

  const response = await fetch(NVIDIA_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NVIDIA NIM API error: ${response.status} - ${error}`);
  }

  const data: NvidiaResponse = await response.json();
  const latency_ms = Date.now() - startTime;

  return {
    content: data.choices[0]?.message?.content || '',
    provider: 'nvidia',
    model: data.model,
    usage: data.usage,
    latency_ms,
  };
}

async function chatWithNvidia(
  messages: AIMessage[],
  options: AIOptions = {}
): Promise<AIResponse> {
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  return traceLLMCall(
    {
      functionName: 'chatWithNvidia',
      prompt: lastMessage,
    },
    () => chatWithNvidiaInternal(messages, options)
  );
}

async function* streamNvidiaResponse(
  messages: AIMessage[],
  options: AIOptions = {}
): AsyncGenerator<AIStreamChunk, void, unknown> {
  const apiKey = process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY;
  
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY eller NVIDIA_NIM_API_KEY må være satt');
  }

  const model = options.model || NVIDIA_MODELS.LLAMA_3_1_70B;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens || 2048;

  const response = await fetch(NVIDIA_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NVIDIA NIM API error: ${response.status} - ${error}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        yield { content: '', done: true };
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true };
            return;
          }

          try {
            const parsed: NvidiaStreamChunk = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              yield { content, done: false };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ==================== UNIFIED INTERFACE ====================

/**
 * Velg beste tilgjengelige provider basert på API-nøkler eller OAuth
 */
export function selectBestProvider(preferred?: AIProvider): AIProvider {
  const hasKimi = !!process.env.MOONSHOT_API_KEY?.trim() || !!process.env.KIMI_API_KEY?.trim();
  const hasNvidia = !!process.env.NVIDIA_API_KEY?.trim() || !!process.env.NVIDIA_NIM_API_KEY?.trim();

  if (preferred && preferred !== 'auto') {
    if (preferred === 'kimi' && hasKimi) return 'kimi';
    if (preferred === 'nvidia' && hasNvidia) return 'nvidia';
  }

  // Auto-select: KIMI -> NVIDIA (fallback)
  if (hasKimi) return 'kimi';
  if (hasNvidia) return 'nvidia';

  throw new Error('Ingen AI provider konfigurert. Sett MOONSHOT_API_KEY, KIMI_API_KEY eller NVIDIA_API_KEY.');
}

/**
 * Hovedfunksjon for AI-chat
 */
export async function chatWithAI(
  options: AIOptions & { messages: AIMessage[] }
): Promise<AIResponse> {
  const provider = selectBestProvider(options.provider);
  
  // Prepend system prompt if provided
  let messages = options.messages;
  if (options.systemPrompt) {
    messages = [
      { role: 'system', content: options.systemPrompt },
      ...options.messages.filter(m => m.role !== 'system')
    ];
  }

  switch (provider) {
    case 'kimi':
      return chatWithKimi(messages, options);
    case 'nvidia':
      return chatWithNvidia(messages, options);
    default:
      throw new Error(`Ukjent provider: ${provider}`);
  }
}

/**
 * Stream AI-respons
 */
export async function* streamAIResponse(
  options: AIOptions & { messages: AIMessage[] }
): AsyncGenerator<AIStreamChunk, void, unknown> {
  const provider = selectBestProvider(options.provider);
  
  let messages = options.messages;
  if (options.systemPrompt) {
    messages = [
      { role: 'system', content: options.systemPrompt },
      ...options.messages.filter(m => m.role !== 'system')
    ];
  }

  switch (provider) {
    case 'kimi':
      yield* streamKimiResponse(messages, options);
      break;
    case 'nvidia':
      yield* streamNvidiaResponse(messages, options);
      break;
    default:
      throw new Error(`Ukjent provider: ${provider}`);
  }
}

/**
 * Sjekk hvilke providere som er tilgjengelige
 */
export async function getAvailableProviders(): Promise<{ provider: AIProvider; available: boolean; models: string[] }[]> {
  const hasKimi = !!process.env.MOONSHOT_API_KEY?.trim() || !!process.env.KIMI_API_KEY?.trim();
  const hasNvidia = !!process.env.NVIDIA_API_KEY?.trim() || !!process.env.NVIDIA_NIM_API_KEY?.trim();

  return [
    {
      provider: 'kimi',
      available: hasKimi,
      models: Object.values(KIMI_MODELS),
    },
    {
      provider: 'nvidia',
      available: hasNvidia,
      models: Object.values(NVIDIA_MODELS),
    },
  ];
}

// ==================== CONVENIENCE FUNCTIONS ====================

/**
 * Spør KIMI om krypto-relaterte spørsmål
 */
export async function askCryptoExpert(
  question: string,
  options?: { provider?: AIProvider; model?: string }
): Promise<string> {
  const response = await chatWithAI({
    provider: options?.provider,
    model: options?.model,
    systemPrompt: SYSTEM_PROMPTS.CRYPTO_EXPERT,
    messages: [{ role: 'user', content: question }],
    temperature: 0.7,
  });

  return response.content;
}

/**
 * Generer markedsanalyse
 */
export async function generateMarketAnalysis(
  marketData: string,
  options?: { provider?: AIProvider }
): Promise<string> {
  const response = await chatWithAI({
    provider: options?.provider,
    systemPrompt: SYSTEM_PROMPTS.MARKET_ANALYST,
    messages: [
      { role: 'user', content: `Analyser følgende markedsdata:\n${marketData}` }
    ],
    temperature: 0.5,
    maxTokens: 500,
  });

  return response.content;
}

/**
 * Hjelp med trading-spørsmål
 */
export async function askTradingAssistant(
  question: string,
  context?: string
): Promise<string> {
  const response = await chatWithAI({
    systemPrompt: SYSTEM_PROMPTS.TRADING_ASSISTANT,
    messages: [
      {
        role: 'user',
        content: context 
          ? `Kontekst: ${context}\n\nSpørsmål: ${question}`
          : question
      }
    ],
    temperature: 0.6,
  });

  return response.content;
}
