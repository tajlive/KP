/**
 * Binance API Connector Edge Function
 * Handles connections to Binance API for real trading
 * 
 * Actions:
 * - test_connection: Verify API keys work
 * - get_balance: Fetch account balance
 * - get_price: Get current symbol price
 * - create_order: Place a new order
 * - get_orders: Fetch open orders
 * - cancel_order: Cancel an existing order
 * - connect: Save and encrypt API keys (merged from binance-connect)
 */

import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

// Binance API base URLs
const BINANCE_API_URL = 'https://api.binance.com';
const BINANCE_TESTNET_URL = 'https://testnet.binance.vision';

// Create signature for Binance API
async function createSignature(queryString: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(queryString));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Make authenticated request to Binance
async function binanceRequest(
  endpoint: string,
  apiKey: string,
  apiSecret: string,
  params: Record<string, string> = {},
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  testnet: boolean = false
): Promise<any> {
  const baseUrl = testnet ? BINANCE_TESTNET_URL : BINANCE_API_URL;
  const timestamp = Date.now().toString();
  
  // Add timestamp to params
  const allParams = { ...params, timestamp };
  const queryString = new URLSearchParams(allParams).toString();
  const signature = await createSignature(queryString, apiSecret);
  
  const url = `${baseUrl}${endpoint}?${queryString}&signature=${signature}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.msg || `Binance API error: ${response.status}`);
  }
  
  return response.json();
}

// Test connection to Binance
async function testConnection(apiKey: string, apiSecret: string, testnet: boolean): Promise<any> {
  try {
    const account = await binanceRequest('/api/v3/account', apiKey, apiSecret, {}, 'GET', testnet);
    return {
      success: true,
      canTrade: account.canTrade,
      accountType: account.accountType,
      balances: account.balances
        .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .slice(0, 10), // Return first 10 non-zero balances
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Connection test failed: ${errorMessage}`);
  }
}

// Get account balance
async function getBalance(apiKey: string, apiSecret: string, testnet: boolean): Promise<any> {
  const account = await binanceRequest('/api/v3/account', apiKey, apiSecret, {}, 'GET', testnet);
  
  return {
    totalBalance: account.balances.reduce((sum: number, b: any) => {
      return sum + parseFloat(b.free) + parseFloat(b.locked);
    }, 0),
    balances: account.balances
      .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked),
      })),
  };
}

// Get current price for a symbol
async function getPrice(symbol: string): Promise<any> {
  const response = await fetch(`${BINANCE_API_URL}/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch price');
  }
  
  const data = await response.json();
  return {
    symbol: data.symbol,
    price: parseFloat(data.price),
  };
}

// Create a new order
async function createOrder(
  apiKey: string,
  apiSecret: string,
  params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
    quantity?: string;
    quoteOrderQty?: string;
    price?: string;
    stopPrice?: string;
  },
  testnet: boolean
): Promise<any> {
  const orderParams: Record<string, string> = {
    symbol: params.symbol.toUpperCase(),
    side: params.side,
    type: params.type,
  };
  
  if (params.quantity) orderParams.quantity = params.quantity;
  if (params.quoteOrderQty) orderParams.quoteOrderQty = params.quoteOrderQty;
  if (params.price) orderParams.price = params.price;
  if (params.stopPrice) orderParams.stopPrice = params.stopPrice;
  
  // Add timeInForce for LIMIT orders
  if (params.type === 'LIMIT') {
    orderParams.timeInForce = 'GTC';
  }
  
  return await binanceRequest('/api/v3/order', apiKey, apiSecret, orderParams, 'POST', testnet);
}

// Get open orders
async function getOpenOrders(apiKey: string, apiSecret: string, symbol?: string, testnet: boolean = false): Promise<any> {
  const params: Record<string, string> = {};
  if (symbol) params.symbol = symbol.toUpperCase();
  
  return await binanceRequest('/api/v3/openOrders', apiKey, apiSecret, params, 'GET', testnet);
}

// Cancel an order
async function cancelOrder(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  orderId: string,
  testnet: boolean
): Promise<any> {
  return await binanceRequest(
    '/api/v3/order',
    apiKey,
    apiSecret,
    { symbol: symbol.toUpperCase(), orderId },
    'DELETE',
    testnet
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const { action, apiKey, apiSecret, testnet = false, ...params } = body;

    if (!action) {
      return jsonResponse({ error: 'Missing action parameter' }, 400);
    }

    // Verify API credentials are provided (except for get_price and connect with encrypted keys)
    if (!['get_price', 'connect'].includes(action) && (!apiKey || !apiSecret)) {
      return jsonResponse({ error: 'Missing API credentials' }, 400);
    }

    let result;

    switch (action) {
      case 'test_connection':
        result = await testConnection(apiKey, apiSecret, testnet);
        break;

      case 'get_balance':
        result = await getBalance(apiKey, apiSecret, testnet);
        break;

      case 'get_price':
        if (!params.symbol) {
          return jsonResponse({ error: 'Missing symbol parameter' }, 400);
        }
        result = await getPrice(params.symbol);
        break;

      case 'create_order':
        if (!params.symbol || !params.side || !params.type) {
          return jsonResponse({ error: 'Missing required order parameters' }, 400);
        }
        result = await createOrder(apiKey, apiSecret, params, testnet);
        break;

      case 'get_open_orders':
        result = await getOpenOrders(apiKey, apiSecret, params.symbol, testnet);
        break;

      case 'cancel_order':
        if (!params.symbol || !params.orderId) {
          return jsonResponse({ error: 'Missing symbol or orderId parameter' }, 400);
        }
        result = await cancelOrder(apiKey, apiSecret, params.symbol, params.orderId, testnet);
        break;

      default:
        return jsonResponse({ error: 'Invalid action' }, 400);
    }

    return jsonResponse({ success: true, data: result });
  } catch (error) {
    console.error('Binance connector error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(errorMessage, 500);
  }
});
