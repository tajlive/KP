/**
 * WebCrypto-based HMAC-SHA256 signer for Binance API requests.
 *
 * Replaces Node's crypto.createHmac so the executor can run in
 * non-Node runtimes (e.g. Cloudflare Workers) without polyfills.
 */

const encoder = new TextEncoder();

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Sign a Binance query string with HMAC-SHA256 using WebCrypto.
 *
 * Output is identical to:
 *   crypto.createHmac('sha256', secret).update(query).digest('hex')
 */
export async function signBinanceQuery(
  secret: string,
  query: string
): Promise<string> {
  if (typeof secret !== 'string' || typeof query !== 'string') {
    throw new TypeError('secret and query must be strings');
  }

  const keyData = encoder.encode(secret);
  const message = encoder.encode(query);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return bufferToHex(signature);
}
