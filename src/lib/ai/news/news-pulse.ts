/**
 * NewsPulse — Sanntids nyhetsovervåking for krypto-markeder.
 *
 * Integrerer med CryptoPanic API (gratis tier: 10k req/mnd) for
 * kuraterte krypto-nyheter med sentiment og symbol-tagging.
 *
 * Fallback: CoinGecko /news endpoint (gratis, ingen API-nøkkel).
 */

export interface NewsItem {
  id: string;
  source: "cryptopanic" | "coingecko" | "coindesk" | "theblock";
  title: string;
  body: string;
  url: string;
  publishedAt: Date;
  symbols: string[];
  sentiment: number; // -1 (bearish) to 1 (bullish)
  impact: "low" | "medium" | "high" | "critical";
  category: "regulation" | "adoption" | "hack" | "partnership" | "launch" | "macro" | "general";
}

interface CryptoPanicPost {
  id: number;
  title: string;
  url: string;
  published_at: string;
  currencies: Array<{ code: string; title: string }>;
  domain: string;
  votes: {
    negative: number;
    positive: number;
    important: number;
  };
}

const CRYPTOPANIC_API = "https://cryptopanic.com/api/v1/posts/";
const COINGECKO_NEWS = "https://api.coingecko.com/api/v3/news";

/** Hent nyheter fra CryptoPanic (primær) eller CoinGecko (fallback) */
export async function fetchCryptoNews(
  filter: "rising" | "hot" | "bullish" | "bearish" | "important" = "hot",
  limit = 20
): Promise<NewsItem[]> {
  const apiKey = process.env.CRYPTOPANIC_API_KEY;

  if (apiKey) {
    return fetchFromCryptoPanic(apiKey, filter, limit);
  }

  return fetchFromCoinGecko(limit);
}

async function fetchFromCryptoPanic(
  apiKey: string,
  filter: string,
  limit: number
): Promise<NewsItem[]> {
  try {
    const url = `${CRYPTOPANIC_API}?auth_token=${apiKey}&filter=${filter}&public=true`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`CryptoPanic ${res.status}`);

    const data = await res.json();
    const posts: CryptoPanicPost[] = data.results ?? [];

    return posts.slice(0, limit).map(mapCryptoPanicPost);
  } catch (e) {
    console.warn(`CryptoPanic failed: ${e}, falling back to CoinGecko`);
    return fetchFromCoinGecko(limit);
  }
}

async function fetchFromCoinGecko(limit: number): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${COINGECKO_NEWS}?per_page=${limit}`);

    if (!res.ok) return [];

    const data = await res.json();
    return (data.data ?? []).map(mapCoinGeckoArticle);
  } catch {
    return [];
  }
}

function mapCryptoPanicPost(post: CryptoPanicPost): NewsItem {
  const totalVotes = post.votes.positive + post.votes.negative + post.votes.important;
  const sentiment =
    totalVotes > 0
      ? (post.votes.positive - post.votes.negative) / totalVotes
      : 0;

  const impact = classifyImpact(post.votes.important, totalVotes);

  return {
    id: `cp_${post.id}`,
    source: "cryptopanic",
    title: post.title,
    body: "",
    url: post.url,
    publishedAt: new Date(post.published_at),
    symbols: (post.currencies ?? []).map((c) => c.code),
    sentiment,
    impact,
    category: detectCategory(post.title),
  };
}

function mapCoinGeckoArticle(article: Record<string, unknown>): NewsItem {
  return {
    id: `cg_${article.id}`,
    source: "coingecko",
    title: String(article.title ?? ""),
    body: String(article.description ?? "").slice(0, 500),
    url: String(article.url ?? ""),
    publishedAt: new Date(String(article.updated_at ?? Date.now())),
    symbols: [],
    sentiment: 0,
    impact: "low",
    category: "general",
  };
}

function classifyImpact(
  importantVotes: number,
  totalVotes: number
): NewsItem["impact"] {
  if (importantVotes > 20) return "critical";
  if (importantVotes > 10) return "high";
  if (importantVotes > 3 || totalVotes > 30) return "medium";
  return "low";
}

function detectCategory(title: string): NewsItem["category"] {
  const t = title.toLowerCase();
  if (/sec|regulation|ban|lawsuit|cfc|fined/i.test(t)) return "regulation";
  if (/partnership|integrates|teams? up/i.test(t)) return "partnership";
  if (/hack|exploit|stolen|drain/i.test(t)) return "hack";
  if (/launch|listed|live|airdrop/i.test(t)) return "launch";
  if (/fed|inflation|rate|gdp|treasury/i.test(t)) return "macro";
  if (/adopt|accepts?|now supports/i.test(t)) return "adoption";
  return "general";
}

/** Finn nyheter for spesifikke symboler */
export async function getNewsForSymbol(
  symbol: string,
  limit = 5
): Promise<NewsItem[]> {
  const all = await fetchCryptoNews("hot", 50);
  return all
    .filter((n) => n.symbols.includes(symbol.toUpperCase()))
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
}

/** Beregn aggregert sentiment fra nyheter for et symbol */
export function aggregateNewsSentiment(news: NewsItem[]): {
  score: number; // -1 to 1
  confidence: number; // 0-1
  topStories: NewsItem[];
} {
  if (news.length === 0) return { score: 0, confidence: 0, topStories: [] };

  const weighted = news.reduce((sum, n) => {
    const w = n.impact === "critical" ? 4 : n.impact === "high" ? 3 : n.impact === "medium" ? 2 : 1;
    return sum + n.sentiment * w;
  }, 0);

  const maxWeight = news.length * 4;
  const score = maxWeight > 0 ? weighted / maxWeight : 0;
  const confidence = Math.min(news.length / 10, 1);

  return {
    score: Math.max(-1, Math.min(1, score)),
    confidence,
    topStories: news.slice(0, 5),
  };
}
