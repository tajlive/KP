export const BINANCE_REFERRAL_CODE = "43427892";

export const BINANCE_REFERRAL_LINK = `https://accounts.binance.com/register?ref=${BINANCE_REFERRAL_CODE}`;

export const BINANCE_REFERRAL = {
  code: BINANCE_REFERRAL_CODE,
  link: BINANCE_REFERRAL_LINK,
  commissionRate: 0.1,
  benefits: {
    user: "20% fee discount",
    referrer: "Commission on trading fees",
  },
} as const;
