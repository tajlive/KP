/**
 * Klarpakke Marketing Content Engine
 *
 * Genererer ukentlig innhold for LinkedIn, Facebook og nyhetsbrev
 * basert på REDAKTØRPLAN-V2.md + sanntallsdata fra Supabase.
 *
 * Bruk:
 *   npx tsx scripts/marketing/content-engine.ts [--week 1] [--dry-run]
 *
 * Output:
 *   content/marketing/queue/YYYY-MM-DD-linkedin.md
 *   content/marketing/queue/YYYY-MM-DD-facebook.md
 *   content/marketing/queue/YYYY-MM-DD-newsletter.html
 *   content/marketing/queue/YYYY-MM-DD-report.json
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface MarketingStats {
  totalUsers: number;
  activePaperSessions: number;
  enabledSmartTrader: number;
  tradesLast7Days: number;
  avgTradeValueNok: number | null;
  totalPnlNok: number | null;
  registrationsRemaining: number;
  kltSlotsRemaining: number;
  weekNumber: number;
  generatedAt: string;
}

interface Post {
  platform: "linkedin" | "facebook";
  title: string;
  body: string;
  hashtags: string;
  scheduledFor: string;
  imagePrompt?: string;
}

interface ContentWeek {
  week: number;
  theme: string;
  linkedinPosts: string[];
  facebookPosts: string[];
}

const EDITORIAL_PLAN_CANDIDATES = [
  path.resolve(process.cwd(), "docs/marketing/REDAKTORPLAN-V2.md"),
  path.resolve(process.cwd(), "REDAKTORPLAN-V2.md"),
];
const EDITORIAL_PLAN_PATH =
  EDITORIAL_PLAN_CANDIDATES.find((p) => existsSync(p)) ??
  EDITORIAL_PLAN_CANDIDATES[0];
const QUEUE_DIR = path.resolve(process.cwd(), "content/marketing/queue");

const KLT_TOTAL_SLOTS = 100;
const KLT_PER_USER = 5000;

/**
 * Hent markedsføringsdata fra Supabase.
 */
async function fetchStats(weekNumber: number): Promise<MarketingStats> {
  let totalUsers = 0;
  try {
    const { data: userList, error: usersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (usersError) throw usersError;
    totalUsers = userList?.total ?? 0;
  } catch (err) {
    console.warn("Kunne ikke hente auth.users:", err instanceof Error ? err.message : err);
  }

  const { data: sessionStats, error: sessionError } = await supabase.rpc(
    "get_marketing_session_stats",
    {}
  );

  // Fallback hvis RPC ikke finnes
  if (sessionError || !sessionStats) {
    const { data: fallbackStats, error: fallbackError } = await supabase
      .from("trading_sessions")
      .select("*")
      .eq("mode", "paper")
      .eq("status", "active");

    if (fallbackError) {
      console.warn("Kunne ikke hente sesjonsstatistikk:", fallbackError.message);
    }

    const activePaperSessions = fallbackStats?.length ?? 0;
    const enabledSmartTrader =
      fallbackStats?.filter((s) => s.smart_trader_enabled).length ?? 0;

    const { data: tradeStats, error: tradeError } = await supabase
      .from("trades")
      .select("total_value, realized_pnl")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (tradeError) {
      console.warn("Kunne ikke hente trade-statistikk:", tradeError.message);
    }

    const tradesLast7Days = tradeStats?.length ?? 0;
    const avgTradeValueNok =
      tradesLast7Days > 0 && tradeStats
        ? tradeStats.reduce((sum, t) => sum + (t.total_value ?? 0), 0) / tradesLast7Days
        : null;
    const totalPnlNok =
      tradeStats && tradeStats.length > 0
        ? tradeStats.reduce((sum, t) => sum + (t.realized_pnl ?? 0), 0)
        : null;

    const registrationsSoFar = Math.min(totalUsers ?? 0, KLT_TOTAL_SLOTS);
    const kltSlotsRemaining = Math.max(0, KLT_TOTAL_SLOTS - registrationsSoFar);

    return {
      totalUsers: totalUsers ?? 0,
      activePaperSessions,
      enabledSmartTrader,
      tradesLast7Days,
      avgTradeValueNok,
      totalPnlNok,
      registrationsRemaining: kltSlotsRemaining,
      kltSlotsRemaining,
      weekNumber,
      generatedAt: new Date().toISOString(),
    };
  }

  return sessionStats as MarketingStats;
}

/**
 * Parse REDAKTØRPLAN-V2.md og trekk ut 4 ukers poster.
 */
async function parseEditorialPlan(): Promise<ContentWeek[]> {
  const markdown = await readFile(EDITORIAL_PLAN_PATH, "utf-8");
  const weeks: ContentWeek[] = [];

  const weekBlocks = markdown.split(/### UKE \d+/).slice(1);

  for (let i = 0; i < weekBlocks.length; i++) {
    const block = weekBlocks[i];
    const headerMatch = markdown.match(/### UKE (\d+)/g)?.[i];
    const week = headerMatch ? parseInt(headerMatch.replace(/\D/g, ""), 10) : i + 1;
    const themeMatch = block.match(/[«"""]([^"""»]+)[»"""]/);
    const theme = themeMatch?.[1]?.trim() ?? `Uke ${week}`;

    const linkedinPosts: string[] = [];
    const facebookPosts: string[] = [];

    const postBlocks = block.split(/\*\*Post \d+[A-Z]/).slice(1);

    for (const postBlock of postBlocks) {
      const liMatch = postBlock.match(/\*LinkedIn:\*\s*\n\n>\s*([\s\S]*?)(?=\n\n\*Facebook)/);
      const fbMatch = postBlock.match(/\*Facebook:\*\s*\n\n>([\s\S]*?)(?=\n\n---|\*\*Post|$)/);

      if (liMatch) linkedinPosts.push(cleanPost(liMatch[1]));
      if (fbMatch) facebookPosts.push(cleanPost(fbMatch[1]));
    }

    weeks.push({ week, theme, linkedinPosts, facebookPosts });
  }

  return weeks;
}

function cleanPost(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.replace(/^>\s?/, "").trim())
    .join("\n")
    .trim();
}

/**
 * Fyll inn plassholdere med faktiske tall.
 */
function hydratePost(template: string, stats: MarketingStats): string {
  return (
    template
      .replace(/\[TALL FRA DASHBOARD[^\]]*\]/gi, formatDashboardNumbers(stats))
      .replace(/\[X av 100 borte[^\]]*\]/gi, formatSlotsRemaining(stats))
      .replace(/\[VALGFRITT[^\]]*\]/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function formatDashboardNumbers(stats: MarketingStats): string {
  const parts: string[] = [];
  if (stats.tradesLast7Days > 0) parts.push(`${stats.tradesLast7Days} paper trades sist uke`);
  if (stats.totalPnlNok !== null && stats.totalPnlNok !== 0) {
    const sign = stats.totalPnlNok > 0 ? "+" : "";
    parts.push(`samlet PnL ${sign}${Math.round(stats.totalPnlNok).toLocaleString("no-NO")} NOK`);
  }
  if (stats.activePaperSessions > 0) {
    parts.push(`${stats.activePaperSessions} aktive paper-sesjoner`);
  }
  if (parts.length === 0) return "Agentene er i gang med paper trading på ekte markedsdata.";
  return parts.join(" · ");
}

function formatSlotsRemaining(stats: MarketingStats): string {
  if (stats.kltSlotsRemaining <= 0) return "Alle 100 plassene er tatt.";
  if (stats.kltSlotsRemaining >= KLT_TOTAL_SLOTS) return "Ingen har hentet KLT-plassene ennå.";
  return `${KLT_TOTAL_SLOTS - stats.kltSlotsRemaining} av ${KLT_TOTAL_SLOTS} plasser er tatt.`;
}

function getPublishDates(weekNumber: number): { monday: string; thursday: string } {
  const base = new Date("2026-07-27T17:00:00+02:00"); // Uke 1 mandag
  const monday = new Date(base.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
  const thursday = new Date(monday.getTime() + 3 * 24 * 60 * 60 * 1000);
  return {
    monday: monday.toISOString(),
    thursday: thursday.toISOString(),
  };
}

function generateImagePrompt(theme: string): string {
  return `1200×630 LinkedIn/FB-bilde for Klarpakke. Tema: "${theme}". Mørk blå gradient (#0a64be → #0c2e60), svakt candlestick-mønster. Hvit Inter-tekst, 80px margin. Ingen tall som ikke er verifisert. DOMENE: klarpakke.no.`;
}

/**
 * Lag HTML-nyhetsbrev basert på ukens poster.
 */
function generateNewsletter(
  week: ContentWeek,
  linkedinPosts: Post[],
  facebookPosts: Post[],
  stats: MarketingStats
): string {
  const rows = linkedinPosts.map((li, i) => {
    const fb = facebookPosts[i];
    return `
      <tr>
        <td style="padding:24px;border-bottom:1px solid #1f2937;">
          <h3 style="margin:0 0 12px;color:#3d7aff;">${li.title}</h3>
          <p style="margin:0 0 16px;white-space:pre-line;color:#e5e7eb;">${escapeHtml(li.body)}</p>
          <a href="https://www.klarpakke.no" style="display:inline-block;padding:10px 16px;background:#0052ff;color:#fff;text-decoration:none;border-radius:6px;">Test gratis på klarpakke.no</a>
        </td>
      </tr>
    `;
  });

  return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8" />
  <title>Klarpakke uke ${stats.weekNumber}</title>
</head>
<body style="margin:0;padding:0;background:#0a0b0d;color:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0b0d;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#111215;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 24px;background:linear-gradient(135deg,#0052ff 0%,#0a0b0d 100%);">
              <h1 style="margin:0;color:#ffffff;font-size:28px;">Klarpakke — uke ${stats.weekNumber}</h1>
              <p style="margin:8px 0 0;color:#cfe0ff;">${week.theme}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#0f1114;">
              <p style="margin:0;color:#9ca3af;font-size:13px;">
                📊 ${stats.activePaperSessions} aktive paper-sesjoner · ${stats.tradesLast7Days} trades sist 7 dager · ${stats.kltSlotsRemaining} av 100 KLT-plasser igjen
              </p>
            </td>
          </tr>
          ${rows.join("")}
          <tr>
            <td style="padding:24px;text-align:center;color:#6b7280;font-size:12px;">
              Du får dette fordi du registrerte deg på klarpakke.no.<br/>
              <a href="{{unsubscribe_url}}" style="color:#6b7280;">Meld deg av</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function postTitle(body: string): string {
  const firstLine = body.split("\n")[0].replace(/[#*]/g, "").trim();
  return firstLine.length > 80 ? firstLine.slice(0, 77) + "..." : firstLine;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const weekArg = args.find((a) => a.startsWith("--week="));
  const weekNumber = weekArg ? parseInt(weekArg.split("=")[1], 10) : getCurrentWeek();

  console.log(`📝 Genererer innhold for uke ${weekNumber}...`);

  if (!existsSync(QUEUE_DIR)) {
    await mkdir(QUEUE_DIR, { recursive: true });
  }

  const weeks = await parseEditorialPlan();
  const week = weeks.find((w) => w.week === weekNumber) ?? weeks[0];
  if (!week) {
    console.error(`Fant ikke uke ${weekNumber} i REDAKTØRPLAN-V2.md`);
    process.exit(1);
  }

  const stats = await fetchStats(weekNumber);
  const { monday, thursday } = getPublishDates(weekNumber);

  const linkedinPosts: Post[] = week.linkedinPosts.slice(0, 2).map((template, i) => ({
    platform: "linkedin",
    title: postTitle(template),
    body: hydratePost(template, stats),
    hashtags: "#klarpakke #krypto #trading #norsk #lekepenger",
    scheduledFor: i === 0 ? monday : thursday,
    imagePrompt: generateImagePrompt(week.theme),
  }));

  const facebookPosts: Post[] = week.facebookPosts.slice(0, 2).map((template, i) => ({
    platform: "facebook",
    title: postTitle(template),
    body: hydratePost(template, stats),
    hashtags: "#klarpakke #krypto #trading #norsk",
    scheduledFor: i === 0 ? monday : thursday,
    imagePrompt: generateImagePrompt(week.theme),
  }));

  const prefix = new Date().toISOString().split("T")[0];

  const outputs: { path: string; content: string }[] = [
    {
      path: path.join(QUEUE_DIR, `${prefix}-linkedin.md`),
      content: formatPostFile(linkedinPosts),
    },
    {
      path: path.join(QUEUE_DIR, `${prefix}-facebook.md`),
      content: formatPostFile(facebookPosts),
    },
    {
      path: path.join(QUEUE_DIR, `${prefix}-newsletter.html`),
      content: generateNewsletter(week, linkedinPosts, facebookPosts, stats),
    },
    {
      path: path.join(QUEUE_DIR, `${prefix}-report.json`),
      content: JSON.stringify(
        {
          week: weekNumber,
          theme: week.theme,
          stats,
          linkedin: linkedinPosts,
          facebook: facebookPosts,
          generatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
    },
  ];

  if (dryRun) {
    console.log("\n🧪 DRY RUN — skriver ikke filer\n");
    for (const out of outputs) {
      console.log(`--- ${out.path} ---`);
      console.log(out.content.slice(0, 800));
      console.log("...\n");
    }
    return;
  }

  for (const out of outputs) {
    await writeFile(out.path, out.content, "utf-8");
    console.log(`✅ Skrev ${out.path}`);
  }

  console.log(`\n🎉 Uke ${weekNumber} klar: ${linkedinPosts.length} LinkedIn, ${facebookPosts.length} Facebook, 1 nyhetsbrev.`);
  console.log(`📊 Tall: ${stats.activePaperSessions} aktive paper · ${stats.tradesLast7Days} trades/7d · ${stats.kltSlotsRemaining} KLT-plasser igjen`);
}

function formatPostFile(posts: Post[]): string {
  return posts
    .map(
      (p) => `---
platform: ${p.platform}
title: ${p.title}
scheduledFor: ${p.scheduledFor}
imagePrompt: ${p.imagePrompt}
status: draft
---

${p.body}

${p.hashtags}
`
    )
    .join("\n---\n\n");
}

function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date("2026-07-27T00:00:00+02:00");
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return Math.max(1, Math.min(4, week));
}

main().catch((err) => {
  console.error("❌ Feil:", err);
  process.exit(1);
});
