/**
 * Social Sentiment — Twitter/X, Telegram, Discord sentiment-aggregering.
 *
 * Utvider eksisterende Reddit-sentiment med flere sosiale kilder.
 * Bruker SocialData API for Twitter/X (gratis tier: 100 req/dag).
 */

export interface SocialSentiment {
  platform: "x" | "telegram" | "reddit" | "discord";
  symbol: string;
  mentions24h: number;
  sentimentScore: number; // -1 to 1
  engagementRate: number; // 0-1
  trending: boolean;
  lastUpdated: Date;
}

/** Hent aggregert sentiment fra alle kilder */
export async function getSocialSentiment(
  symbol: string
): Promise<SocialSentiment[]> {
  const results = await Promise.allSettled([
    getTwitterSentiment(symbol),
    getRedditSentiment(symbol),
  ]);

  const sentiments: SocialSentiment[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      sentiments.push(result.value);
    }
  }

  return sentiments;
}

async function getTwitterSentiment(
  symbol: string
): Promise<SocialSentiment | null> {
  const apiKey = process.env.SOCIALDATA_API_KEY;
  if (!apiKey) return null;

  try {
    const query = encodeURIComponent(`$${symbol} crypto`);
    const res = await fetch(
      `https://api.socialdata.tools/twitter/search?query=${query}&type=latest`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const tweets = data.tweets ?? [];
    const withEngagement = tweets.map((t: { retweet_count: number; favorite_count: number }) =>
      (t.retweet_count ?? 0) + (t.favorite_count ?? 0)
    );

    return {
      platform: "x",
      symbol,
      mentions24h: tweets.length,
      sentimentScore: estimateTwitterSentiment(tweets),
      engagementRate: withEngagement.length > 0
        ? Math.min(withEngagement.reduce((s: number, e: number) => s + e, 0) / (withEngagement.length * 100), 1)
        : 0,
      trending: tweets.length > 100,
      lastUpdated: new Date(),
    };
  } catch {
    return null;
  }
}

async function getRedditSentiment(
  symbol: string
): Promise<SocialSentiment | null> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/CryptoCurrency/search.json?q=${encodeURIComponent(symbol)}&sort=new&limit=25`,
      { headers: { "User-Agent": "Klarpakke/1.0" } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const posts = data.data?.children ?? [];

    if (posts.length === 0) return null;

    const withScores = posts.map(
      (p: { data: { score: number; num_comments: number } }) =>
        (p.data.score ?? 0) + (p.data.num_comments ?? 0)
    );

    return {
      platform: "reddit",
      symbol,
      mentions24h: posts.length,
      sentimentScore: estimateRedditSentiment(posts),
      engagementRate: withScores.length > 0
        ? Math.min(withScores.reduce((s: number, e: number) => s + e, 0) / (withScores.length * 200), 1)
        : 0,
      trending: withScores.reduce((s: number, e: number) => s + e, 0) > 500,
      lastUpdated: new Date(),
    };
  } catch {
    return null;
  }
}

function estimateTwitterSentiment(tweets: Array<{ text: string }>): number {
  const bullishWords = /bullish|moon|lfg|long|buy|accumulating|bottom|breakout|pump/i;
  const bearishWords = /bearish|dump|short|sell|top|crash|dead|scam/i;

  let score = 0;
  for (const tweet of tweets) {
    if (bullishWords.test(tweet.text)) score += 0.1;
    if (bearishWords.test(tweet.text)) score -= 0.1;
  }
  return Math.max(-1, Math.min(1, score / Math.max(tweets.length, 1)));
}

function estimateRedditSentiment(posts: Array<{ data: { title: string; selftext?: string } }>): number {
  const bullishWords = /bullish|moon|lfg|long|buy|accumulating|green|pump/i;
  const bearishWords = /bearish|dump|short|sell|red|crash|dead/i;

  let score = 0;
  for (const post of posts) {
    const text = `${post.data.title} ${post.data.selftext ?? ""}`;
    if (bullishWords.test(text)) score += 0.08;
    if (bearishWords.test(text)) score -= 0.08;
  }
  return Math.max(-1, Math.min(1, score / Math.max(posts.length, 1)));
}

/** Beregn samlet sentiment på tvers av plattformer */
export function aggregateSocialSentiment(
  sentiments: SocialSentiment[]
): { score: number; confidence: number; platforms: number } {
  if (sentiments.length === 0) return { score: 0, confidence: 0, platforms: 0 };

  const weighted = sentiments.reduce((sum, s) => sum + s.sentimentScore * (s.engagementRate + 0.5), 0);
  const totalWeight = sentiments.reduce((sum, s) => sum + (s.engagementRate + 0.5), 0);

  return {
    score: totalWeight > 0 ? weighted / totalWeight : 0,
    confidence: Math.min(sentiments.length / 3, 1),
    platforms: sentiments.length,
  };
}
