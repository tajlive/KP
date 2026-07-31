/**
 * Klarpakke Facebook Publisher
 *
 * Publiserer et forhåndsgenerert Facebook-innlegg via Browserbase + Playwright.
 *
 * Bruk:
 *   # Lag ny sesjon og få login-URL
 *   npx tsx scripts/marketing/publish-facebook.ts --file=content/marketing/queue/YYYY-MM-DD-facebook.md --create-session
 *
 *   # Publiser med eksisterende innlogget sesjon
 *   npx tsx scripts/marketing/publish-facebook.ts --file=content/marketing/queue/YYYY-MM-DD-facebook.md --session-id=<id>
 *
 *   # Tørrkjøring
 *   npx tsx scripts/marketing/publish-facebook.ts --file=... --session-id=... --dry-run
 */
import { chromium, type Browser, type Page } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID ?? "61592276566006";

if (!BROWSERBASE_API_KEY) {
  console.error("Mangler BROWSERBASE_API_KEY");
  process.exit(1);
}

interface FacebookPost {
  title: string;
  body: string;
  scheduledFor: string;
  imagePrompt?: string;
}

interface SessionInfo {
  id: string;
  connectUrl: string;
  debuggerUrl?: string;
  status: string;
}

async function createBrowserbaseSession(): Promise<SessionInfo> {
  const response = await fetch("https://www.browserbase.com/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BB-API-Key": BROWSERBASE_API_KEY!,
    },
    body: JSON.stringify({
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      timeout: 3600,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Browserbase session create failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const id = data.id;
  const connectUrl = data.connectUrl as string;

  return {
    id,
    connectUrl,
    debuggerUrl: `https://www.browserbase.com/sessions/${id}`,
    status: data.status,
  };
}

async function getSessionStatus(sessionId: string): Promise<string> {
  const response = await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
    headers: { "X-BB-API-Key": BROWSERBASE_API_KEY! },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not get session status: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.status;
}

function parsePostFile(filePath: string): FacebookPost[] {
  // Simpel parser for frontmatter + body
  const content = readFile(filePath, "utf-8");
  // implementeres under
  return [];
}

async function parsePostFileAsync(filePath: string): Promise<FacebookPost[]> {
  const raw = await readFile(path.resolve(process.cwd(), filePath), "utf-8");
  const posts: FacebookPost[] = [];
  const blocks = raw.split(/\n---\n\n/);

  for (const block of blocks) {
    const frontmatter: Record<string, string> = {};
    const fmMatch = block.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) continue;

    const fmText = fmMatch[1];
    const body = fmMatch[2].trim();

    for (const line of fmText.split("\n")) {
      const [key, ...rest] = line.split(":");
      if (key && rest.length > 0) {
        frontmatter[key.trim()] = rest.join(":").trim();
      }
    }

    posts.push({
      title: frontmatter.title ?? "",
      body,
      scheduledFor: frontmatter.scheduledFor ?? "",
      imagePrompt: frontmatter.imagePrompt,
    });
  }

  return posts;
}

async function isLoggedIn(page: Page): Promise<boolean> {
  await page.goto("https://www.facebook.com/me", { waitUntil: "domcontentloaded", timeout: 30000 });
  const url = page.url();
  return !url.includes("/login");
}

async function publishPost(page: Page, post: FacebookPost, dryRun: boolean): Promise<void> {
  const pageUrl = `https://www.facebook.com/profile.php?id=${FACEBOOK_PAGE_ID}`;
  console.log(`🔗 Går til ${pageUrl}`);
  await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 60000 });

  // Rull til toppen der "Create post"-knappen er
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);

  // Facebook skifter selektorer ofte. Prøv flere strategier.
  const createPostSelectors = [
    '[aria-label*="Create post"]',
    '[aria-label*="Create a post"]',
    '[role="button"]:has-text("Create post")',
    '[role="button"]:has-text("What\'s on your mind")',
    'div[role="button"][tabindex="0"] span:has-text("Create post")',
  ];

  let clicked = false;
  for (const selector of createPostSelectors) {
    try {
      const el = await page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        clicked = true;
        console.log(`👉 Klikket "Create post" med selector: ${selector}`);
        break;
      }
    } catch {
      // prøv neste
    }
  }

  if (!clicked) {
    throw new Error("Fant ikke 'Create post'-knappen. Facebook kan ha endret UI.");
  }

  // Vent på at komposisjonsmodal åpner seg
  await page.waitForTimeout(2000);

  // Finn tekstfelt (Lexical editor)
  const editorSelectors = [
    '[role="textbox"][aria-label*="What\'s on your mind"]',
    '[role="textbox"][contenteditable="true"]',
    '[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]',
  ];

  let editor: import("playwright").Locator | null = null;
  for (const selector of editorSelectors) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      editor = el;
      break;
    }
  }

  if (!editor) {
    throw new Error("Fant ikke tekstfelt i post-komponisten.");
  }

  // Skriv tekst linje for linje med Enter for å unngå komprimering av linjeskift
  const lines = post.body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    await editor.type(lines[i], { delay: 10 });
    if (i < lines.length - 1) {
      await editor.press("Enter");
    }
  }

  console.log(`✅ Tekst fylt inn (${post.body.length} tegn)`);

  // TODO: Bildeopplasting via DataTransfer-injeksjon
  if (post.imagePrompt) {
    console.log("🖼️ Bildeopplasting er ikke implementert ennå. Post publiseres uten bilde.");
  }

  if (dryRun) {
    console.log("\n🧪 DRY RUN — publiserer ikke.\n");
    console.log("Tekst som ville blitt publisert:");
    console.log(post.body);
    console.log("\nLukker modal uten å poste...");
    await page.keyboard.press("Escape");
    return;
  }

  // Klikk Post-knapp
  const postButtonSelectors = [
    '[role="button"][aria-label="Post"]',
    '[role="button"]:has-text("Post")',
    'div[role="button"] span:has-text("Post")',
  ];

  let posted = false;
  for (const selector of postButtonSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        posted = true;
        console.log(`🚀 Klikket Post-knapp`);
        break;
      }
    } catch {
      // prøv neste
    }
  }

  if (!posted) {
    throw new Error("Fant ikke Post-knappen.");
  }

  // Vent på at posten publiseres
  await page.waitForTimeout(5000);
  console.log("✅ Post publisert (forutsatt at ingen captcha/feil oppstod)");
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith("--file="));
  const sessionIdArg = args.find((a) => a.startsWith("--session-id="));
  const createSession = args.includes("--create-session");
  const dryRun = args.includes("--dry-run");

  if (!fileArg && !createSession) {
    console.error("Bruk: --file=... [--session-id=... | --create-session] [--dry-run]");
    process.exit(1);
  }

  if (createSession) {
    console.log("🔗 Oppretter ny Browserbase-sesjon...");
    const session = await createBrowserbaseSession();
    console.log(`\n🔑 Session ID: ${session.id}`);
    if (session.debuggerUrl) {
      console.log(`👁️  Logg inn på Facebook her: ${session.debuggerUrl}`);
    }
    console.log(`\nNår du er logget inn, kjør:\n  npx tsx scripts/marketing/publish-facebook.ts --file=<fil> --session-id=${session.id}`);
    return;
  }

  const file = fileArg!.split("=")[1];
  const posts = await parsePostFileAsync(file);
  if (posts.length === 0) {
    console.error("Ingen poster funnet i filen.");
    process.exit(1);
  }

  // Publiser første post som ikke har scheduledFor i fremtiden
  const now = new Date();
  const post = posts.find((p) => !p.scheduledFor || new Date(p.scheduledFor) <= now) ?? posts[0];

  console.log(`📸 Kobler til Browserbase-sesjon ${sessionIdArg!.split("=")[1]}...`);
  const sessionId = sessionIdArg!.split("=")[1];
  const status = await getSessionStatus(sessionId);
  console.log(`   Sesjonsstatus: ${status}`);

  const connectUrl = `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}&sessionId=${sessionId}`;
  const browser = await chromium.connectOverCDP(connectUrl);

  let page: Page;
  const context = browser.contexts()[0];
  if (context?.pages().length) {
    page = context.pages()[0];
  } else {
    page = await browser.newPage();
  }

  try {
    console.log("🔐 Sjekker Facebook-innlogging...");
    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      console.error("\n❌ Sesjonen er ikke logget inn på Facebook.");
      console.error("   1. Kjør: npx tsx scripts/marketing/publish-facebook.ts --create-session");
      console.error("   2. Åpne debugger-URL og logg inn manuelt.");
      console.error("   3. Kjør publisering igjen med samme session-id.");
      process.exit(1);
    }

    console.log("🟢 Innlogget. Starter publisering...\n");
    await publishPost(page, post, dryRun);

    console.log("\n📋 Oppsummering:");
    console.log(`   Plattform: Facebook`);
    console.log(`   Side-ID: ${FACEBOOK_PAGE_ID}`);
    console.log(`   Publisert: ${dryRun ? "NEI (dry-run)" : "JA"}`);
    console.log(`   Tekstlengde: ${post.body.length} tegn`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("\n❌ Feil:", err);
  process.exit(1);
});
