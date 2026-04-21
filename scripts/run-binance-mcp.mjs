#!/usr/bin/env node
/**
 * 📈 Binance MCP Server
 * 
 * Gir tilgang til Binance API for:
 * - Markedsdata (priser, order books, klines)
 * - Trading (spot, margin, futures)
 * - Konto-informasjon
 * - WebSocket streams
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHmac } from 'crypto';

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
const API_KEY = env.BINANCE_API_KEY || process.env.BINANCE_API_KEY;
const API_SECRET = env.BINANCE_API_SECRET || process.env.BINANCE_API_SECRET;
const TESTNET = env.BINANCE_TESTNET === 'true' || process.env.BINANCE_TESTNET === 'true';

const BASE_URL = TESTNET 
  ? 'https://testnet.binance.vision' 
  : 'https://api.binance.com';

// MCP Server implementation
class BinanceMCP {
  constructor() {
    this.serverInfo = {
      name: 'binance-mcp',
      version: '1.0.0',
      description: 'Binance Trading API MCP Server'
    };
    this.testnet = TESTNET;
  }

  generateSignature(queryString) {
    if (!API_SECRET) throw new Error('BINANCE_API_SECRET ikke satt');
    return createHmac('sha256', API_SECRET).update(queryString).digest('hex');
  }

  async api(path, options = {}, signed = false) {
    let url = `${BASE_URL}${path}`;
    
    if (signed && API_KEY && API_SECRET) {
      const timestamp = Date.now();
      let queryString = `timestamp=${timestamp}`;
      
      if (options.body) {
        const bodyParams = new URLSearchParams(options.body).toString();
        queryString += `&${bodyParams}`;
      }
      
      const signature = this.generateSignature(queryString);
      url += `${path.includes('?') ? '&' : '?'}${queryString}&signature=${signature}`;
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(signed && API_KEY ? { 'X-MBX-APIKEY': API_KEY } : {}),
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(`Binance API ${res.status}: ${data.msg || data.message || res.statusText}`);
    }
    
    return data;
  }

  // ===== PUBLIC ENDPOINTS =====

  async getServerTime() {
    return this.api('/api/v3/time');
  }

  async getExchangeInfo() {
    const data = await this.api('/api/v3/exchangeInfo');
    return {
      timezone: data.timezone,
      serverTime: data.serverTime,
      symbols: data.symbols.map(s => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        status: s.status,
        isSpotTradingAllowed: s.isSpotTradingAllowed
      }))
    };
  }

  async getTickerPrice(symbol) {
    const path = symbol ? `/api/v3/ticker/price?symbol=${symbol}` : '/api/v3/ticker/price';
    return this.api(path);
  }

  async get24hrTicker(symbol) {
    const path = symbol ? `/api/v3/ticker/24hr?symbol=${symbol}` : '/api/v3/ticker/24hr';
    const data = await this.api(path);
    
    const format = (t) => ({
      symbol: t.symbol,
      priceChange: t.priceChange,
      priceChangePercent: t.priceChangePercent,
      weightedAvgPrice: t.weightedAvgPrice,
      lastPrice: t.lastPrice,
      highPrice: t.highPrice,
      lowPrice: t.lowPrice,
      volume: t.volume,
      quoteVolume: t.quoteVolume
    });
    
    return Array.isArray(data) ? data.map(format) : format(data);
  }

  async getOrderBook(symbol, limit = 100) {
    return this.api(`/api/v3/depth?symbol=${symbol}&limit=${limit}`);
  }

  async getKlines(symbol, interval = '1h', limit = 100) {
    const data = await this.api(`/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    return data.map(k => ({
      openTime: k[0],
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
      closeTime: k[6],
      quoteVolume: k[7]
    }));
  }

  async getAvgPrice(symbol) {
    return this.api(`/api/v3/avgPrice?symbol=${symbol}`);
  }

  // ===== PRIVATE ENDPOINTS (require API key) =====

  async getAccount() {
    if (!API_KEY) throw new Error('BINANCE_API_KEY ikke satt');
    return this.api('/api/v3/account', {}, true);
  }

  async getAccountSnapshot(type = 'SPOT') {
    if (!API_KEY) throw new Error('BINANCE_API_KEY ikke satt');
    return this.api(`/api/v3/accountSnapshot?type=${type}`, {}, true);
  }

  async newOrder(params) {
    if (!API_KEY) throw new Error('BINANCE_API_KEY ikke satt');
    
    const body = new URLSearchParams();
    body.append('symbol', params.symbol);
    body.append('side', params.side);
    body.append('type', params.type);
    
    if (params.quantity) body.append('quantity', params.quantity);
    if (params.price) body.append('price', params.price);
    if (params.timeInForce) body.append('timeInForce', params.timeInForce);
    if (params.stopPrice) body.append('stopPrice', params.stopPrice);
    
    return this.api('/api/v3/order', {
      method: 'POST',
      body: body.toString()
    }, true);
  }

  async getOpenOrders(symbol) {
    if (!API_KEY) throw new Error('BINANCE_API_KEY ikke satt');
    const path = symbol ? `/api/v3/openOrders?symbol=${symbol}` : '/api/v3/openOrders';
    return this.api(path, {}, true);
  }

  async cancelOrder(symbol, orderId) {
    if (!API_KEY) throw new Error('BINANCE_API_KEY ikke satt');
    return this.api(`/api/v3/order?symbol=${symbol}&orderId=${orderId}`, {
      method: 'DELETE'
    }, true);
  }

  async getOrder(symbol, orderId) {
    if (!API_KEY) throw new Error('BINANCE_API_KEY ikke satt');
    return this.api(`/api/v3/order?symbol=${symbol}&orderId=${orderId}`, {}, true);
  }

  async getMyTrades(symbol) {
    if (!API_KEY) throw new Error('BINANCE_API_KEY ikke satt');
    return this.api(`/api/v3/myTrades?symbol=${symbol}`, {}, true);
  }

  // ===== MCP PROTOCOL =====

  handleRequest(req) {
    const { method, params } = req;

    switch (method) {
      case 'initialize':
        return {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: this.serverInfo
        };

      case 'tools/list':
        return {
          tools: [
            {
              name: 'get_server_time',
              description: 'Hent Binance server-tid',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'get_exchange_info',
              description: 'Hent exchange informasjon og tilgjengelige symboler',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'get_ticker_price',
              description: 'Hent nåværende pris for symbol(er)',
              inputSchema: {
                type: 'object',
                properties: {
                  symbol: { type: 'string', description: 'Symbol (f.eks. BTCUSDT). La stå tom for alle.' }
                }
              }
            },
            {
              name: 'get_24hr_ticker',
              description: 'Hent 24-timers statistikk for symbol(er)',
              inputSchema: {
                type: 'object',
                properties: {
                  symbol: { type: 'string', description: 'Symbol (valgfri)' }
                }
              }
            },
            {
              name: 'get_order_book',
              description: 'Hent order book for et symbol',
              inputSchema: {
                type: 'object',
                properties: {
                  symbol: { type: 'string', description: 'Symbol (f.eks. BTCUSDT)' },
                  limit: { type: 'number', description: 'Dybde (5, 10, 20, 50, 100, 500, 1000)', default: 100 }
                },
                required: ['symbol']
              }
            },
            {
              name: 'get_klines',
              description: 'Hent candlestick/K-line data',
              inputSchema: {
                type: 'object',
                properties: {
                  symbol: { type: 'string', description: 'Symbol (f.eks. BTCUSDT)' },
                  interval: { type: 'string', description: 'Intervall (1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M)', default: '1h' },
                  limit: { type: 'number', description: 'Antall candlesticks (maks 1000)', default: 100 }
                },
                required: ['symbol']
              }
            },
            {
              name: 'get_avg_price',
              description: 'Hent gjennomsnittlig pris for et symbol',
              inputSchema: {
                type: 'object',
                properties: {
                  symbol: { type: 'string', description: 'Symbol (f.eks. BTCUSDT)' }
                },
                required: ['symbol']
              }
            },
            {
              name: 'get_account',
              description: 'Hent konto-informasjon (krever API key)',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'new_order',
              description: 'Opprett ny ordre (krever API key)',
              inputSchema: {
                type: 'object',
                properties: {
                  symbol: { type: 'string', description: 'Symbol (f.eks. BTCUSDT)' },
                  side: { type: 'string', enum: ['BUY', 'SELL'], description: 'Kjøp eller salg' },
                  type: { type: 'string', enum: ['LIMIT', 'MARKET', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'], description: 'Ordretype' },
                  quantity: { type: 'string', description: 'Mengde' },
                  price: { type: 'string', description: 'Pris (for LIMIT-ordrer)' },
                  timeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], description: 'Gyldighet', default: 'GTC' },
                  stopPrice: { type: 'string', description: 'Stop-pris (for STOP-ordrer)' }
                },
                required: ['symbol', 'side', 'type']
              }
            },
            {
              name: 'get_open_orders',
              description: 'Hent åpne ordre (krever API key)',
              inputSchema: {
                type: 'object',
                properties: {
                  symbol: { type: 'string', description: 'Symbol (valgfri)' }
                }
              }
            },
            {
              name: 'cancel_order',
              description: 'Kanseller ordre (krever API key)',
              inputSchema: {
                type: 'object',
                properties: {
                  symbol: { type: 'string', description: 'Symbol' },
                  orderId: { type: 'number', description: 'Ordre ID' }
                },
                required: ['symbol', 'orderId']
              }
            },
            {
              name: 'get_order',
              description: 'Hent ordre-status (krever API key)',
              inputSchema: {
                type: 'object',
                properties: {
                  symbol: { type: 'string' },
                  orderId: { type: 'number' }
                },
                required: ['symbol', 'orderId']
              }
            },
            {
              name: 'get_my_trades',
              description: 'Hent trade-historikk for symbol (krever API key)',
              inputSchema: {
                type: 'object',
                properties: {
                  symbol: { type: 'string', description: 'Symbol (f.eks. BTCUSDT)' }
                },
                required: ['symbol']
              }
            }
          ]
        };

      case 'tools/call':
        const { name, arguments: args } = params;

        switch (name) {
          case 'get_server_time':
            return this.getServerTime();
          case 'get_exchange_info':
            return this.getExchangeInfo();
          case 'get_ticker_price':
            return this.getTickerPrice(args.symbol);
          case 'get_24hr_ticker':
            return this.get24hrTicker(args.symbol);
          case 'get_order_book':
            return this.getOrderBook(args.symbol, args.limit);
          case 'get_klines':
            return this.getKlines(args.symbol, args.interval, args.limit);
          case 'get_avg_price':
            return this.getAvgPrice(args.symbol);
          case 'get_account':
            return this.getAccount();
          case 'new_order':
            return this.newOrder(args);
          case 'get_open_orders':
            return this.getOpenOrders(args.symbol);
          case 'cancel_order':
            return this.cancelOrder(args.symbol, args.orderId);
          case 'get_order':
            return this.getOrder(args.symbol, args.orderId);
          case 'get_my_trades':
            return this.getMyTrades(args.symbol);
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
const mcp = new BinanceMCP();

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

console.error('📈 Binance MCP Server started');
console.error(`   Testnet: ${TESTNET}`);
console.error(`   API Key: ${API_KEY ? 'Konfigurert' : 'Mangler'}`);
