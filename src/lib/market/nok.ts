const FALLBACK_USDT_NOK = 10.92;

export function getDisplayUsdtToNokRate(): number {
  const env = process.env.NEXT_PUBLIC_USDT_NOK_RATE;
  if (env) {
    const parsed = Number(env);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return FALLBACK_USDT_NOK;
}

export function usdtPriceToNok(
  priceUsdt: number,
  rate = getDisplayUsdtToNokRate(),
): number {
  return priceUsdt * rate;
}

export function nokPriceToUsdt(
  priceNok: number,
  rate = getDisplayUsdtToNokRate(),
): number {
  return rate > 0 ? priceNok / rate : 0;
}
