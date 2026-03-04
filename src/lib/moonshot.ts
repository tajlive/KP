/**
 * Moonshot AI (KIMI) API Service
 * 
 * Dokumentasjon: https://platform.moonshot.cn/docs
 * 
 * Modeller:
 * - moonshot-v1-8k: 8k context window
 * - moonshot-v1-32k: 32k context window  
 * - moonshot-v1-128k: 128k context window
 */

export const MOONSHOT_MODELS = {
  SMALL: 'moonshot-v1-8k',
  MEDIUM: 'moonshot-v1-32k',
  LARGE: 'moonshot-v1-128k',
} as const;

export type MoonshotModel = typeof MOONSHOT_MODELS[keyof typeof MOONSHOT_MODELS];

export interface MoonshotMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MoonshotResponse {
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

export interface MoonshotStreamChunk {
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

const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * Send en melding til Moonshot AI (server-side only)
 * 
 * @param messages - Array av meldinger
 * @param model - Modell å bruke (default: moonshot-v1-8k)
 * @param temperature - Kreativitet (0-1, default: 0.7)
 * @param maxTokens - Maks tokens i respons
 * @returns Promise med AI-respons
 */
export async function chatWithMoonshot(
  messages: MoonshotMessage[],
  options: {
    model?: MoonshotModel;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  } = {}
): Promise<MoonshotResponse | ReadableStream> {
  const {
    model = MOONSHOT_MODELS.SMALL,
    temperature = 0.7,
    maxTokens = 2048,
    stream = false,
  } = options;

  const apiKey = process.env.MOONSHOT_API_KEY;
  
  if (!apiKey) {
    throw new Error('MOONSHOT_API_KEY is not set in environment variables');
  }

  const response = await fetch(MOONSHOT_API_URL, {
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
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Moonshot API error: ${response.status} - ${error}`);
  }

  if (stream && response.body) {
    return response.body;
  }

  return response.json() as Promise<MoonshotResponse>;
}

/**
 * Enkel wrapper for å spørre om krypto-relaterte spørsmål
 */
export async function askCryptoExpert(
  question: string,
  options?: {
    model?: MoonshotModel;
    includeContext?: boolean;
  }
): Promise<string> {
  const messages: MoonshotMessage[] = [
    {
      role: 'system',
      content: `Du er en ekspert innen kryptovaluta og blockchain-teknologi for Klarpakke Universitet.
Ditt navn er "Kimi" - en AI-assistent spesialisert på å hjelpe norske brukere med:
- Kryptovaluta grunnleggende
- Trading-strategier
- Risikostyring
- Teknisk analyse
- Markedstrender

Viktige retningslinjer:
- Svar alltid på norsk
- Vær presis og konsis
- Inkluder alltid en risikoadvarsel når du snakker om trading/investering
- Aldri gi finansiell rådgivning, bare utdanning
- Vær hjelpsom og pedagogisk`,
    },
    {
      role: 'user',
      content: question,
    },
  ];

  const response = await chatWithMoonshot(messages, {
    model: options?.model,
    temperature: 0.7,
  }) as MoonshotResponse;

  return response.choices[0]?.message?.content || 'Beklager, jeg kunne ikke generere et svar.';
}

/**
 * Stream respons fra Moonshot AI
 */
export async function* streamMoonshotResponse(
  messages: MoonshotMessage[],
  options: {
    model?: MoonshotModel;
    temperature?: number;
  } = {}
): AsyncGenerator<string, void, unknown> {
  const response = await chatWithMoonshot(messages, {
    ...options,
    stream: true,
  }) as ReadableStream;

  const reader = response.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed: MoonshotStreamChunk = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              yield content;
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
