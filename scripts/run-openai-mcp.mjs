#!/usr/bin/env node
/**
 * 🤖 OpenAI MCP Server
 * 
 * Gir tilgang til OpenAI API for:
 * - Chat completions
 * - Embeddings
 * - Assistants
 * - Files
 * - Fine-tuning
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load environment variables
function loadEnv() {
  const envPath = resolve(root, '.env.local');
  const env = {};
  if (!existsSync(envPath)) return env;
  
  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const eq = trimmed.indexOf('=');
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/\\"/g, '"');
        }
        env[key] = value;
      }
    }
  } catch (_) {}
  return env;
}

const env = loadEnv();
const API_KEY = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const ORG_ID = env.OPENAI_ORG_ID || process.env.OPENAI_ORG_ID;

const BASE_URL = 'https://api.openai.com/v1';

// MCP Server implementation
class OpenAIMCP {
  constructor() {
    this.serverInfo = {
      name: 'openai-mcp',
      version: '1.0.0',
      description: 'OpenAI API MCP Server'
    };
  }

  async api(path, options = {}) {
    if (!API_KEY) {
      throw new Error('OPENAI_API_KEY ikke satt');
    }

    const headers = {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (ORG_ID) {
      headers['OpenAI-Organization'] = ORG_ID;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      const msg = data?.error?.message || data?.message || res.statusText;
      throw new Error(`OpenAI API ${res.status}: ${msg}`);
    }
    
    return data;
  }

  // ===== CHAT =====

  async chatCompletion(params) {
    const data = await this.api('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: params.model || 'gpt-4o-mini',
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.max_tokens,
        top_p: params.top_p ?? 1,
        frequency_penalty: params.frequency_penalty ?? 0,
        presence_penalty: params.presence_penalty ?? 0,
        stream: false
      })
    });

    return {
      id: data.id,
      model: data.model,
      content: data.choices[0]?.message?.content,
      usage: data.usage,
      finish_reason: data.choices[0]?.finish_reason
    };
  }

  // ===== EMBEDDINGS =====

  async createEmbedding(params) {
    const data = await this.api('/embeddings', {
      method: 'POST',
      body: JSON.stringify({
        model: params.model || 'text-embedding-3-small',
        input: params.input,
        encoding_format: 'float'
      })
    });

    return {
      model: data.model,
      embeddings: data.data.map(d => ({
        index: d.index,
        embedding: d.embedding
      })),
      usage: data.usage
    };
  }

  // ===== MODELS =====

  async listModels() {
    const data = await this.api('/models');
    return (data.data || [])
      .filter(m => m.id.includes('gpt') || m.id.includes('text-embedding'))
      .map(m => ({
        id: m.id,
        created: m.created,
        owned_by: m.owned_by
      }))
      .sort((a, b) => b.created - a.created);
  }

  async getModel(modelId) {
    return this.api(`/models/${modelId}`);
  }

  // ===== ASSISTANTS =====

  async listAssistants(limit = 20) {
    const data = await this.api(`/assistants?limit=${limit}`, { method: 'GET' });
    return (data.data || []).map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      model: a.model,
      created_at: a.created_at
    }));
  }

  async createAssistant(params) {
    return this.api('/assistants', {
      method: 'POST',
      body: JSON.stringify({
        model: params.model || 'gpt-4o-mini',
        name: params.name,
        description: params.description,
        instructions: params.instructions,
        tools: params.tools || []
      })
    });
  }

  async getAssistant(assistantId) {
    return this.api(`/assistants/${assistantId}`, { method: 'GET' });
  }

  async deleteAssistant(assistantId) {
    return this.api(`/assistants/${assistantId}`, { method: 'DELETE' });
  }

  // ===== THREADS =====

  async createThread() {
    return this.api('/threads', { method: 'POST', body: '{}' });
  }

  async getThread(threadId) {
    return this.api(`/threads/${threadId}`, { method: 'GET' });
  }

  async deleteThread(threadId) {
    return this.api(`/threads/${threadId}`, { method: 'DELETE' });
  }

  async createMessage(threadId, content, role = 'user') {
    return this.api(`/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content })
    });
  }

  async listMessages(threadId) {
    const data = await this.api(`/threads/${threadId}/messages`, { method: 'GET' });
    return (data.data || []).map(m => ({
      id: m.id,
      role: m.role,
      content: m.content[0]?.text?.value,
      created_at: m.created_at
    }));
  }

  async createRun(threadId, assistantId) {
    return this.api(`/threads/${threadId}/runs`, {
      method: 'POST',
      body: JSON.stringify({ assistant_id: assistantId })
    });
  }

  async getRun(threadId, runId) {
    return this.api(`/threads/${threadId}/runs/${runId}`, { method: 'GET' });
  }

  // ===== MCP PROTOCOL =====

  handleRequest(req) {
    const { method, params } = req;

    switch (method) {
      case 'initialize':
        return { 
          serverInfo: this.serverInfo,
          hasApiKey: !!API_KEY,
          orgId: ORG_ID ? 'Konfigurert' : 'Ikke satt'
        };

      case 'tools/list':
        return {
          tools: [
            {
              name: 'chat_completion',
              description: 'Send chat completion request til OpenAI',
              inputSchema: {
                type: 'object',
                properties: {
                  model: { 
                    type: 'string', 
                    description: 'Model ID (gpt-4o, gpt-4o-mini, gpt-4-turbo, etc.)',
                    default: 'gpt-4o-mini'
                  },
                  messages: {
                    type: 'array',
                    description: 'Array av meldinger med role og content',
                    items: {
                      type: 'object',
                      properties: {
                        role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                        content: { type: 'string' }
                      }
                    }
                  },
                  temperature: { type: 'number', description: '0-2, høyere = mer kreativ', default: 0.7 },
                  max_tokens: { type: 'number', description: 'Maks tokens i respons' },
                  top_p: { type: 'number', default: 1 },
                  frequency_penalty: { type: 'number', default: 0 },
                  presence_penalty: { type: 'number', default: 0 }
                },
                required: ['messages']
              }
            },
            {
              name: 'create_embedding',
              description: 'Generer embedding vektor for tekst',
              inputSchema: {
                type: 'object',
                properties: {
                  input: { 
                    type: ['string', 'array'], 
                    description: 'Tekst eller array av tekster' 
                  },
                  model: { 
                    type: 'string', 
                    description: 'Embedding model',
                    default: 'text-embedding-3-small'
                  }
                },
                required: ['input']
              }
            },
            {
              name: 'list_models',
              description: 'List tilgjengelige OpenAI modeller',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'get_model',
              description: 'Hent informasjon om en spesifikk modell',
              inputSchema: {
                type: 'object',
                properties: {
                  modelId: { type: 'string', description: 'Model ID (f.eks. gpt-4o)' }
                },
                required: ['modelId']
              }
            },
            {
              name: 'list_assistants',
              description: 'List alle assistants',
              inputSchema: {
                type: 'object',
                properties: {
                  limit: { type: 'number', description: 'Maks antall', default: 20 }
                }
              }
            },
            {
              name: 'create_assistant',
              description: 'Opprett ny assistant',
              inputSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  instructions: { type: 'string' },
                  model: { type: 'string', default: 'gpt-4o-mini' },
                  tools: { type: 'array', description: 'Array av tool definitions' }
                },
                required: ['name', 'instructions']
              }
            },
            {
              name: 'get_assistant',
              description: 'Hent assistant detaljer',
              inputSchema: {
                type: 'object',
                properties: {
                  assistantId: { type: 'string' }
                },
                required: ['assistantId']
              }
            },
            {
              name: 'delete_assistant',
              description: 'Slett assistant',
              inputSchema: {
                type: 'object',
                properties: {
                  assistantId: { type: 'string' }
                },
                required: ['assistantId']
              }
            },
            {
              name: 'create_thread',
              description: 'Opprett ny conversation thread',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'get_thread',
              description: 'Hent thread detaljer',
              inputSchema: {
                type: 'object',
                properties: {
                  threadId: { type: 'string' }
                },
                required: ['threadId']
              }
            },
            {
              name: 'delete_thread',
              description: 'Slett thread',
              inputSchema: {
                type: 'object',
                properties: {
                  threadId: { type: 'string' }
                },
                required: ['threadId']
              }
            },
            {
              name: 'create_message',
              description: 'Legg til melding i thread',
              inputSchema: {
                type: 'object',
                properties: {
                  threadId: { type: 'string' },
                  content: { type: 'string' },
                  role: { type: 'string', enum: ['user', 'assistant'], default: 'user' }
                },
                required: ['threadId', 'content']
              }
            },
            {
              name: 'list_messages',
              description: 'List meldinger i thread',
              inputSchema: {
                type: 'object',
                properties: {
                  threadId: { type: 'string' }
                },
                required: ['threadId']
              }
            },
            {
              name: 'create_run',
              description: 'Kjør assistant på thread',
              inputSchema: {
                type: 'object',
                properties: {
                  threadId: { type: 'string' },
                  assistantId: { type: 'string' }
                },
                required: ['threadId', 'assistantId']
              }
            },
            {
              name: 'get_run',
              description: 'Hent run status',
              inputSchema: {
                type: 'object',
                properties: {
                  threadId: { type: 'string' },
                  runId: { type: 'string' }
                },
                required: ['threadId', 'runId']
              }
            }
          ]
        };

      case 'tools/call':
        const { name, arguments: args } = params;

        switch (name) {
          case 'chat_completion':
            return this.chatCompletion(args);
          case 'create_embedding':
            return this.createEmbedding(args);
          case 'list_models':
            return this.listModels();
          case 'get_model':
            return this.getModel(args.modelId);
          case 'list_assistants':
            return this.listAssistants(args.limit);
          case 'create_assistant':
            return this.createAssistant(args);
          case 'get_assistant':
            return this.getAssistant(args.assistantId);
          case 'delete_assistant':
            return this.deleteAssistant(args.assistantId);
          case 'create_thread':
            return this.createThread();
          case 'get_thread':
            return this.getThread(args.threadId);
          case 'delete_thread':
            return this.deleteThread(args.threadId);
          case 'create_message':
            return this.createMessage(args.threadId, args.content, args.role);
          case 'list_messages':
            return this.listMessages(args.threadId);
          case 'create_run':
            return this.createRun(args.threadId, args.assistantId);
          case 'get_run':
            return this.getRun(args.threadId, args.runId);
          default:
            throw new Error(`Ukjent tool: ${name}`);
        }

      default:
        throw new Error(`Ukjent method: ${method}`);
    }
  }
}

// Stdio transport for MCP
const mcp = new OpenAIMCP();

process.stdin.setEncoding('utf8');

let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  
  let lines = buffer.split('\n');
  buffer = lines.pop();
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const req = JSON.parse(line);
      const result = await mcp.handleRequest(req);
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\n');
    } catch (err) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32000, message: err.message }
      }) + '\n');
    }
  }
});

console.error('🤖 OpenAI MCP Server started');
console.error(`   API Key: ${API_KEY ? 'Konfigurert' : 'Mangler'}`);
console.error(`   Org ID: ${ORG_ID ? 'Konfigurert' : 'Ikke satt'}`);
