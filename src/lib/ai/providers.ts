/**
 * Unified AI Providers Service
 * 
 * Støtter:
 * - KIMI K3 via Kimi Code OAuth - https://api.kimi.com/coding/v1
 * - NVIDIA NIM - https://build.nvidia.com/
 * - DeepSeek V4 - https://platform.deepseek.com/
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

export type AIProvider = 'kimi' | 'nvidia' | 'deepseek' | 'auto';

export type ChatProvider = AIProvider | 'perplexity';

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
  /** Ignoreres for KIMI — temperature er fiksert (1.0) og skal ikke sendes eksplisitt. */
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
  /** Kun K3: low/high/max (IKKE medium). Default: high. */
  reasoningEffort?: KimiReasoningEffort;
}

// ==================== KIMI K3 (GLOBAL API VIA MOONSHOT) CONFIG ====================
//
// Prioriteringsrekkefølge for autentisering:
//   1. KIMI_API_KEY — Global Kimi Open Platform (api.moonshot.ai/v1, anbefalt)
//   2. KIMI_OAUTH_TOKEN — OAuth-token fra Kimi Code (api.kimi.com/coding/v1, utløper ~50 min)
//
// KIMI_API_KEY: Stabil API-nøkkel fra https://platform.kimi.ai. $3/1M input, $15/1M output.
//   Endepunkt: https://api.moonshot.ai/v1/chat/completions
//   Modell-id: kimi-k3 / kimi-k2.7-code / kimi-k2.7-code-highspeed
//   Støtter: reasoning_effort (low/high/max), temperature=1, vision, 1M kontekst
//
// KIMI_OAUTH_TOKEN: OAuth-token eller Kimi Code Console-nøkkel. Utløper ~50 min.
//   Endepunkt: https://api.kimi.com/coding/v1/chat/completions
//   Modell-id: k3 / kimi-for-coding / kimi-for-coding-highspeed
//   Støtter: reasoning_effort (low/high/max), men ikke temperature/top_p

// Auto-detect endpoint basert på tilgjengelig API-nøkkel
function getKimiEndpoint(): string {
  if (process.env.KIMI_API_KEY?.trim()) {
    return 'https://api.moonshot.ai/v1/chat/completions';
  }
  return 'https://api.kimi.com/coding/v1/chat/completions';
}

// Auto-detect model-id format basert på endpoint
function getKimiModelId(model: KimiModel, endpoint: string): string {
  if (endpoint.includes('moonshot.ai')) {
    // Global API bruker kimi-k3 / kimi-k2.7-code / kimi-k2.7-code-highspeed
    switch (model) {
      case KIMI_MODELS.K3: return 'kimi-k3';
      case KIMI_MODELS.K2_7_CODE: return 'kimi-k2.7-code';
      case KIMI_MODELS.K2_7_CODE_HIGHSPEED: return 'kimi-k2.7-code-highspeed';
    }
  }
  // Kimi Code API bruker forkortede modell-id-er
  return model;
}

// Dynamisk endpoint — bruker getKimiEndpoint() som sjekker KIMI_API_KEY før KIMI_OAUTH_TOKEN

export type KimiReasoningEffort = 'low' | 'high' | 'max';

const DEFAULT_KIMI_EFFORT: KimiReasoningEffort = 'high';

export const KIMI_MODELS = {
  K3: 'k3',
  K2_7_CODE: 'kimi-for-coding',
  K2_7_CODE_HIGHSPEED: 'kimi-for-coding-highspeed',
} as const;

export type KimiModel = typeof KIMI_MODELS[keyof typeof KIMI_MODELS];

/**
 * Løs opp modell-alias. reasoningEffort returneres KUN for K3 (eneste modell
 * som støtter det). Ukjente/legacy aliasser (moonshot-v1-*, kimi-k2-6) → K3.
 */
export function resolveKimiModel(modelOrAlias?: string): {
  model: KimiModel;
  reasoningEffort?: KimiReasoningEffort;
} {
  const alias = modelOrAlias?.trim().toLowerCase();

  switch (alias) {
    case 'kimi-for-coding':
    case 'kimi-k2.7-code': // Global API alias
    case 'kimi-k2-7-code': // legacy alias
      return { model: KIMI_MODELS.K2_7_CODE };
    case 'kimi-k2.7-code-highspeed': // Global API alias
    case 'kimi-for-coding-highspeed':
      return { model: KIMI_MODELS.K2_7_CODE_HIGHSPEED };
    default:
      // 'k3' / 'kimi-k3' / 'kimi-k3-global' / undefined / legacy → K3
      return { model: KIMI_MODELS.K3, reasoningEffort: DEFAULT_KIMI_EFFORT };
  }
}

/**
 * Bygger request-body for Kimi Code-endepunktet.
 * temperature sendes ALDRI (fiksert=1.0 for K3/K2.7 — 400-feil hvis annet).
 * Reasoning-tokens teller mot max_tokens — 8192 gir headroom ved effort=high.
 */
export function buildKimiPayload(
  messages: AIMessage[],
  options: AIOptions & { stream: boolean }
): Record<string, unknown> {
  const endpoint = getKimiEndpoint();
  const { model, reasoningEffort } = resolveKimiModel(options.model);
  const apiModelId = getKimiModelId(model, endpoint);
  const maxTokens = options.maxTokens || 8192;

  const body: Record<string, unknown> = {
    model: apiModelId,
    messages,
    max_tokens: maxTokens,
    stream: options.stream,
  };

  // reasoning_effort kun for K3
  const effort = model === KIMI_MODELS.K3
    ? (options.reasoningEffort ?? reasoningEffort)
    : undefined;
  if (effort) {
    body.reasoning_effort = effort;
  }

  // Global API (api.moonshot.ai) støtter temperature=1
  if (endpoint.includes('moonshot.ai') && model === KIMI_MODELS.K3) {
    body.temperature = 1;
  }

  return body;
}

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
  // Prioriter: KIMI_API_KEY (Global API) → KIMI_OAUTH_TOKEN (Kimi Code OAuth)
  const globalApiKey = process.env.KIMI_API_KEY?.trim();
  const oauthToken = process.env.KIMI_OAUTH_TOKEN?.trim();
  const apiKey = globalApiKey || oauthToken;

  if (!apiKey) {
    throw new Error('Ingen Kimi API-nøkkel funnet. Sett KIMI_API_KEY (anbefalt) eller KIMI_OAUTH_TOKEN i miljøvariabler.');
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

// ==================== DEEPSEEK CONFIG ====================

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export const DEEPSEEK_MODELS = {
  V4_PRO: 'deepseek-chat',
  V4_FLASH: 'deepseek-v4-flash',
} as const;

export type DeepSeekModel = typeof DEEPSEEK_MODELS[keyof typeof DEEPSEEK_MODELS];

interface DeepSeekResponse {
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

interface DeepSeekStreamChunk {
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
  const body = buildKimiPayload(messages, { ...options, stream: false });

  const response = await fetch(getKimiEndpoint(), {
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

export async function chatWithKimi(
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

export async function* streamKimiResponse(
  messages: AIMessage[],
  options: AIOptions = {}
): AsyncGenerator<AIStreamChunk, void, unknown> {
  const headers = await getKimiAuthHeader();
  const body = buildKimiPayload(messages, { ...options, stream: true });

  const response = await fetch(getKimiEndpoint(), {
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

// ==================== DEEPSEEK IMPLEMENTATION ====================

async function chatWithDeepSeekInternal(
  messages: AIMessage[],
  options: AIOptions = {}
): Promise<AIResponse> {
  const startTime = Date.now();
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY er ikke satt i miljøvariabler');
  }

  const model = options.model || DEEPSEEK_MODELS.V4_PRO;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens || 2048;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
  }

  const data: DeepSeekResponse = await response.json();
  const latency_ms = Date.now() - startTime;

  return {
    content: data.choices[0]?.message?.content || '',
    provider: 'deepseek',
    model: data.model,
    usage: data.usage,
    latency_ms,
  };
}

export async function chatWithDeepSeek(
  messages: AIMessage[],
  options: AIOptions = {}
): Promise<AIResponse> {
  const lastMessage = messages[messages.length - 1]?.content || '';

  return traceLLMCall(
    {
      functionName: 'chatWithDeepSeek',
      prompt: lastMessage,
    },
    () => chatWithDeepSeekInternal(messages, options)
  );
}

export async function* streamDeepSeekResponse(
  messages: AIMessage[],
  options: AIOptions = {}
): AsyncGenerator<AIStreamChunk, void, unknown> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY er ikke satt i miljøvariabler');
  }

  const model = options.model || DEEPSEEK_MODELS.V4_PRO;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens || 2048;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
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
            const parsed: DeepSeekStreamChunk = JSON.parse(data);
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

function hasKimiApi(): boolean {
  return !!process.env.KIMI_API_KEY?.trim() || !!process.env.KIMI_OAUTH_TOKEN?.trim();
}

function hasDeepSeekApi(): boolean {
  return !!process.env.DEEPSEEK_API_KEY?.trim();
}

function hasNvidiaApi(): boolean {
  return !!process.env.NVIDIA_API_KEY?.trim() || !!process.env.NVIDIA_NIM_API_KEY?.trim();
}

/**
 * Velg beste tilgjengelige provider basert på API-nøkler eller OAuth
 */
export function selectBestProvider(preferred?: AIProvider): AIProvider {
  const hasKimi = hasKimiApi();
  const hasDeepSeek = hasDeepSeekApi();
  const hasNvidia = hasNvidiaApi();

  if (preferred && preferred !== 'auto') {
    if (preferred === 'kimi' && hasKimi) return 'kimi';
    if (preferred === 'deepseek' && hasDeepSeek) return 'deepseek';
    if (preferred === 'nvidia' && hasNvidia) return 'nvidia';
  }

  // Auto-select: KIMI -> DeepSeek -> NVIDIA (fallback)
  if (hasKimi) return 'kimi';
  if (hasDeepSeek) return 'deepseek';
  if (hasNvidia) return 'nvidia';

  throw new Error('Ingen AI provider konfigurert. Sett KIMI_API_KEY, KIMI_OAUTH_TOKEN, DEEPSEEK_API_KEY eller NVIDIA_API_KEY i miljøvariabler.');
}

// ==================== SMART TASK ROUTING ====================

export type TaskTier = 'simple' | 'complex' | 'architecture' | 'websearch';

export interface ProviderPlan {
  provider: ChatProvider;
  model?: string;
  reasoningEffort?: KimiReasoningEffort;
  tier: TaskTier;
}

const ARCHITECTURE_KEYWORDS = [
  'arkitektur', 'architecture', 'design system', 'refactor', 'refaktor',
  'migrasjon', 'migration', 'strategi', 'strategy', 'system design',
  'teknisk design', 'data model', 'datamodell', 'arkitekturbeslutning',
];

const COMPLEX_KEYWORDS = [
  'debug', 'feilsøk', 'analyser', 'analyze', 'optimize', 'optimaliser',
  'performance', 'sikkerhet', 'security', 'root cause', 'rotårsak',
  'race condition', 'memory leak', 'deadlock',
];

const WEBSEARCH_KEYWORDS = [
  'websearch', 'søk nettet', 'søk på nettet', 'latest news', 'siste nytt',
  'hva skjer i', 'what is the current', 'live price', 'current price',
];

/**
 * Klassifiser en samtale basert på innhold og lengde.
 * Brukes til å velge riktig modell (kostnad vs kvalitet).
 */
export function classifyTask(messages: AIMessage[]): TaskTier {
  const text = messages.map(m => m.content).join('\n').toLowerCase();
  const combinedLength = messages.reduce((sum, m) => sum + m.content.length, 0);

  if (WEBSEARCH_KEYWORDS.some(k => text.includes(k))) {
    return 'websearch';
  }

  if (ARCHITECTURE_KEYWORDS.some(k => text.includes(k)) || combinedLength > 6000) {
    return 'architecture';
  }

  if (COMPLEX_KEYWORDS.some(k => text.includes(k)) || combinedLength > 1500) {
    return 'complex';
  }

  return 'simple';
}

/**
 * Bygg en prioritert liste over provider-planer for en gitt oppgave.
 * Første plan = billigst/adekvat, siste plan = dyrest/best.
 * Hvis en plan feiler, prøves neste (fallback).
 */
export function selectProviderPlan(
  messages: AIMessage[],
  forceProvider?: ChatProvider,
  websearch = false,
): ProviderPlan[] {
  const hasKimi = hasKimiApi();
  const hasDeepSeek = hasDeepSeekApi();
  const hasNvidia = hasNvidiaApi();
  const hasPerplexity = !!process.env.PERPLEXITY_API_KEY?.trim();

  // Eksplisitt tvang
  if (forceProvider && forceProvider !== 'auto') {
    if (forceProvider === 'perplexity' && hasPerplexity) {
      return [{ provider: 'perplexity', model: 'sonar-pro', tier: 'websearch' }];
    }
    if (forceProvider === 'kimi' && hasKimi) {
      return [{ provider: 'kimi', model: KIMI_MODELS.K2_7_CODE, tier: 'complex' }];
    }
    if (forceProvider === 'deepseek' && hasDeepSeek) {
      return [{ provider: 'deepseek', model: DEEPSEEK_MODELS.V4_PRO, tier: 'simple' }];
    }
    if (forceProvider === 'nvidia' && hasNvidia) {
      return [{ provider: 'nvidia', model: NVIDIA_MODELS.LLAMA_3_1_70B, tier: 'simple' }];
    }
  }

  const tier = websearch ? 'websearch' : classifyTask(messages);

  switch (tier) {
    case 'websearch':
      return [
        ...(hasPerplexity ? [{ provider: 'perplexity' as const, model: 'sonar-pro', tier }] : []),
        ...(hasKimi ? [{ provider: 'kimi' as const, model: KIMI_MODELS.K3, reasoningEffort: 'high' as const, tier: 'architecture' as const }] : []),
      ];

    case 'architecture':
      return [
        ...(hasKimi ? [{ provider: 'kimi' as const, model: KIMI_MODELS.K3, reasoningEffort: 'max' as const, tier }] : []),
        ...(hasDeepSeek ? [{ provider: 'deepseek' as const, model: DEEPSEEK_MODELS.V4_PRO, tier: 'complex' as const }] : []),
        ...(hasNvidia ? [{ provider: 'nvidia' as const, model: NVIDIA_MODELS.LLAMA_3_1_405B, tier: 'complex' as const }] : []),
      ];

    case 'complex':
      return [
        ...(hasKimi ? [{ provider: 'kimi' as const, model: KIMI_MODELS.K2_7_CODE, tier }] : []),
        ...(hasDeepSeek ? [{ provider: 'deepseek' as const, model: DEEPSEEK_MODELS.V4_PRO, tier: 'simple' as const }] : []),
        ...(hasNvidia ? [{ provider: 'nvidia' as const, model: NVIDIA_MODELS.LLAMA_3_1_70B, tier: 'simple' as const }] : []),
      ];

    case 'simple':
    default:
      return [
        ...(hasDeepSeek ? [{ provider: 'deepseek' as const, model: DEEPSEEK_MODELS.V4_FLASH, tier }] : []),
        ...(hasKimi ? [{ provider: 'kimi' as const, model: KIMI_MODELS.K2_7_CODE, tier: 'complex' as const }] : []),
        ...(hasNvidia ? [{ provider: 'nvidia' as const, model: NVIDIA_MODELS.LLAMA_3_1_8B, tier: 'simple' as const }] : []),
      ];
  }
}

/**
 * Hovedfunksjon for AI-chat (legacy, bruker selectBestProvider)
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
    case 'deepseek':
      return chatWithDeepSeek(messages, options);
    case 'nvidia':
      return chatWithNvidia(messages, options);
    default:
      throw new Error(`Ukjent provider: ${provider}`);
  }
}

/**
 * Stream AI-respons (legacy, bruker selectBestProvider)
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
    case 'deepseek':
      yield* streamDeepSeekResponse(messages, options);
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
  const hasKimi = hasKimiApi();
  const hasDeepSeek = hasDeepSeekApi();
  const hasNvidia = hasNvidiaApi();

  return [
    {
      provider: 'kimi',
      available: hasKimi,
      models: Object.values(KIMI_MODELS),
    },
    {
      provider: 'deepseek',
      available: hasDeepSeek,
      models: Object.values(DEEPSEEK_MODELS),
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
