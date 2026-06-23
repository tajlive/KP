import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { signBinanceQuery } from '../binance-signer';

function nodeHmac(secret: string, query: string): string {
  return crypto.createHmac('sha256', secret).update(query).digest('hex');
}

describe('signBinanceQuery', () => {
  it('matches Node crypto for a realistic Binance query', async () => {
    const secret = 'NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5f3j8mB';
    const query = 'symbol=BTCUSDT&side=BUY&type=MARKET&quantity=0.001&timestamp=1499827319559';

    const webCryptoSig = await signBinanceQuery(secret, query);
    const nodeSig = nodeHmac(secret, query);

    expect(webCryptoSig).toBe(nodeSig);
    expect(webCryptoSig).toHaveLength(64);
  });

  it('matches Node crypto for an empty query string', async () => {
    const secret = 'aVeryLongAndVerySecretKeyThatShouldBeRandom';
    const query = '';

    const webCryptoSig = await signBinanceQuery(secret, query);
    const nodeSig = nodeHmac(secret, query);

    expect(webCryptoSig).toBe(nodeSig);
  });

  it('matches Node crypto for a secret containing special characters', async () => {
    const secret = 's3cr3t!@#$%^&*()_+-=[]{}|;\':",./<>?`~\\';
    const query = 'recvWindow=5000&timestamp=1700000000000';

    const webCryptoSig = await signBinanceQuery(secret, query);
    const nodeSig = nodeHmac(secret, query);

    expect(webCryptoSig).toBe(nodeSig);
  });

  it('throws TypeError for non-string inputs', async () => {
    await expect(signBinanceQuery(undefined as unknown as string, 'query')).rejects.toThrow(
      new TypeError('secret and query must be strings')
    );
    await expect(signBinanceQuery('secret', null as unknown as string)).rejects.toThrow(
      new TypeError('secret and query must be strings')
    );
    await expect(signBinanceQuery('secret', 123 as unknown as string)).rejects.toThrow(
      new TypeError('secret and query must be strings')
    );
    await expect(signBinanceQuery(123 as unknown as string, 'query')).rejects.toThrow(
      new TypeError('secret and query must be strings')
    );
  });

  it('matches Node crypto for Unicode secret and query', async () => {
    const secret = '🔑 s3kr3t 密钥';
    const query = 'symbol=BTCUSDT&note=日本語';

    const webCryptoSig = await signBinanceQuery(secret, query);
    const nodeSig = nodeHmac(secret, query);

    expect(webCryptoSig).toBe(nodeSig);
  });
});
