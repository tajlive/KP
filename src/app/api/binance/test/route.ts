
import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/utils/error';

/**
 * Test Binance API credentials
 * Calls Binance account endpoint to verify keys
 */

// Helper function to create HMAC-SHA256 signature using Web Crypto API
async function createSignature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  
  // Convert to hex
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const { apiKey, apiSecret, testnet } = await request.json();

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, error: 'API key and secret are required' },
        { status: 400 }
      );
    }

    // Binance API base URL
    const baseUrl = testnet 
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';

    // Test endpoint: Get account information
    const endpoint = '/api/v3/account';
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;

    // Create signature using Web Crypto API
    const signature = await createSignature(queryString, apiSecret);

    const url = `${baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    // Make request to Binance
    const response = await fetch(url, , { signal: controller.signal }
  clearTimeout(timeoutId);
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Binance API error:', data);
      return NextResponse.json(
        {
          success: false,
          error: data.msg || 'Failed to connect to Binance',
          code: data.code,
        },
        { status: 400 }
      );
    }

    // Extract relevant account info
    const accountInfo = {
      canTrade: data.canTrade,
      canWithdraw: data.canWithdraw,
      canDeposit: data.canDeposit,
      accountType: data.accountType,
      permissions: data.permissions || [],
      balances: data.balances
        ?.filter((b: { free?: string; locked?: string }) => parseFloat(b.free || '0') > 0 || parseFloat(b.locked || '0') > 0)
        .slice(0, 5), // Return only top 5 balances
    };

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Binance',
      accountInfo,
    });

  } catch (error: unknown) {
    console.error('Error testing Binance API:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
