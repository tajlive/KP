#!/usr/bin/env node
/**
 * 🎨 Sanity MCP Server
 *
 * Gir tilgang til Sanity HTTP API for:
 * - GROQ-queries
 * - Dokument-oppslag
 * - Schema-type oversikt
 * - Tilkoblingssjekk
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEnvLocal } from './load-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = loadEnvLocal();
const PROJECT_ID = env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const DATASET = env.NEXT_PUBLIC_SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const API_VERSION = env.NEXT_PUBLIC_SANITY_API_VERSION || process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-04-07';
const READ_TOKEN = env.SANITY_API_READ_TOKEN || process.env.SANITY_API_READ_TOKEN;

const BASE_URL = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}`;

class SanityMCP {
  constructor() {
    this.serverInfo = {
      name: 'sanity-mcp',
      version: '1.0.0',
      description: 'Sanity CMS API MCP Server for Klarpakke'
    };
    this.schemaTypes = [
      'page',
      'landingContent',
      'strategy',
      'tradeExplanation',
      'faq',
      'testimonial',
      'designTokens'
    ];
  }

  async api(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const makeRequest = async (useToken) => {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      if (useToken && READ_TOKEN) {
        headers['Authorization'] = `Bearer ${READ_TOKEN}`;
      }
      return fetch(url, { ...options, headers });
    };

    let res = await makeRequest(true);
    let data = await res.json().catch(() => null);

    // If token is invalid, retry without auth (public datasets work without token)
    if (!res.ok && res.status === 401 && READ_TOKEN) {
      res = await makeRequest(false);
      data = await res.json().catch(() => null);
    }

    if (!res.ok) {
      const msg = data?.message || data?.error?.description || res.statusText;
      throw new Error(`Sanity API ${res.status}: ${msg}`);
    }

    return data;
  }

  async query(groqQuery, params = {}) {
    const encodedQuery = encodeURIComponent(groqQuery);
    let url = `/data/query/${DATASET}?query=${encodedQuery}`;
    if (params && Object.keys(params).length > 0) {
      for (const [key, value] of Object.entries(params)) {
        url += `&$${key}=${encodeURIComponent(JSON.stringify(value))}`;
      }
    }
    const data = await this.api(url);
    return data.result;
  }

  async getDocument(id) {
    return this.query(`*[_id == $id][0]`, { id });
  }

  async getDocumentsByType(type) {
    return this.query(`*[_type == $type]`, { type });
  }

  async checkConnection() {
    if (!PROJECT_ID) {
      return { ok: false, error: 'NEXT_PUBLIC_SANITY_PROJECT_ID is not set' };
    }
    try {
      const data = await this.api(`/data/query/${DATASET}?query=${encodeURIComponent('*[_id == "sanity.system.document"][0]')}`);
      return { ok: true, projectId: PROJECT_ID, dataset: DATASET, apiVersion: API_VERSION, hasReadToken: !!READ_TOKEN, result: data.result };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  handleRequest(req) {
    const { method, params } = req;

    switch (method) {
      case 'initialize':
        return {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: this.serverInfo
        };

      case 'tools/list':
        return {
          tools: [
            {
              name: 'sanity_check_connection',
              description: 'Sjekk at Sanity API-et er tilgjengelig',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'sanity_query',
              description: 'Kjør en GROQ-query mot Sanity',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'GROQ query string' },
                  params: { type: 'object', description: 'Query parametere (valgfri)' }
                },
                required: ['query']
              }
            },
            {
              name: 'sanity_get_document',
              description: 'Hent et dokument med _id',
              inputSchema: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Dokument _id' }
                },
                required: ['id']
              }
            },
            {
              name: 'sanity_get_documents_by_type',
              description: 'Hent alle dokumenter av en gitt _type',
              inputSchema: {
                type: 'object',
                properties: {
                  type: { type: 'string', description: 'Schema type (f.eks. page, faq, testimonial, designTokens)' }
                },
                required: ['type']
              }
            },
            {
              name: 'sanity_list_schema_types',
              description: 'List registrerte schema-typer i Klarpakke',
              inputSchema: { type: 'object', properties: {} }
            }
          ]
        };

      case 'tools/call':
        const { name, arguments: args } = params;

        switch (name) {
          case 'sanity_check_connection':
            return this.checkConnection();
          case 'sanity_query':
            return this.query(args.query, args.params || {});
          case 'sanity_get_document':
            return this.getDocument(args.id);
          case 'sanity_get_documents_by_type':
            return this.getDocumentsByType(args.type);
          case 'sanity_list_schema_types':
            return { schemaTypes: this.schemaTypes };
          default:
            throw new Error(`Ukjent tool: ${name}`);
        }

      case 'notifications/initialized':
        // MCP lifecycle notification — ignorer, ikke send respons
        return undefined;

      default:
        throw new Error(`Ukjent method: ${method}`);
    }
  }
}

// Stdio transport for MCP
const mcp = new SanityMCP();

process.stdin.setEncoding('utf8');

let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;

  let lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;

    let req;
    try {
      req = JSON.parse(line);
    } catch (err) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: ' + err.message }
      }) + '\n');
      continue;
    }

    try {
      const result = await mcp.handleRequest(req);
      // Ikke send respons for notifications (de har ingen id)
      if (req.id !== undefined && req.id !== null) {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\n');
      }
    } catch (err) {
      // Ikke send error-respons for notifications (de har ingen id)
      if (req.id !== undefined && req.id !== null) {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: req.id,
          error: { code: -32000, message: err.message }
        }) + '\n');
      } else {
        console.error('Notification error:', err.message);
      }
    }
  }
});

console.error('🎨 Sanity MCP Server started');
console.error(`   Project: ${PROJECT_ID || '(ikke satt)'}`);
console.error(`   Dataset: ${DATASET}`);
console.error(`   API Version: ${API_VERSION}`);
console.error(`   Read Token: ${READ_TOKEN ? '★★★' : 'mangler'}`);
