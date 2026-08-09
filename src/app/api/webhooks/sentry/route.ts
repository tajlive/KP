/**
 * Sentry Webhook → Trello «🚨 Varsler» (2026-standard).
 *
 * Bakgrunn (2026-08-09): QueryClientProvider-krasj ble logget til Sentry,
 * men INGEN ble varslet — feilen ble oppdaget av brukeren i konsollen.
 * Denne webhooken gjør Sentry-feil om til et Trello-kort automatisk.
 *
 * Oppsett (én gang, i Sentry UI):
 *   Settings → Developer Settings → Internal Integration → Webhooks:
 *   URL: https://www.klarpakke.no/api/webhooks/sentry
 *   Triggers: issue (created) — eller Alert Rule: "When an event is seen
 *   in level:error → send webhook".
 *
 * Sikkerhet: SENTRY_WEBHOOK_SECRET-verifisering via sentry-hook-signature
 * (HMAC-SHA256 av body). Uten secret (dev) logges og droppes webhooken
 * likevel med 200 for å unngå retry-storm — men kun etter signatursjekk
 * når secret ER satt.
 *
 * @module api/webhooks/sentry
 */

import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "edge";

const TRELLO_LIST_VARSLE = "6a77a7b720d121385c010083";

interface SentryIssuePayload {
  action?: string;
  data?: {
    issue?: {
      id?: string;
      title?: string;
      culprit?: string;
      level?: string;
      web_url?: string;
      project?: { name?: string; slug?: string };
      firstSeen?: string;
      count?: number;
    };
    event?: {
      title?: string;
      level?: string;
      web_url?: string;
      culprit?: string;
    };
  };
}

function verifySentrySignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body, "utf8");
  const digest = hmac.digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, "utf8"),
      Buffer.from(signature, "utf8"),
    );
  } catch {
    return false;
  }
}

async function postTrelloCard(name: string, desc: string): Promise<boolean> {
  const key = process.env.TRELLO_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!key || !token) return false;

  const res = await fetch("https://api.trello.com/1/cards", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      key,
      token,
      idList: TRELLO_LIST_VARSLE,
      name: name.slice(0, 160),
      desc: desc.slice(0, 4000),
      pos: "top",
    }),
  });
  return res.ok;
}

export async function POST(req: Request) {
  const body = await req.text();

  // Signaturverifisering når secret er satt (prodkrav)
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers.get("sentry-hook-signature");
    if (!verifySentrySignature(body, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // Kun nye issues / error-events er interessante — dropp støy
  const resource = req.headers.get("sentry-hook-resource");
  if (resource && !["issue", "event_alert", "error"].includes(resource)) {
    return NextResponse.json({ ok: true, skipped: resource });
  }

  let payload: SentryIssuePayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const issue = payload.data?.issue ?? payload.data?.event;
  if (!issue) {
    return NextResponse.json({ ok: true, skipped: "no-issue" });
  }

  // Kun error/fatal — warning/info er for mye støy for Trello
  const level = (issue.level ?? "error").toLowerCase();
  if (!["error", "fatal"].includes(level)) {
    return NextResponse.json({ ok: true, skipped: `level:${level}` });
  }

  const title = issue.title ?? "Ukjent Sentry-feil";
  const culprit = "culprit" in issue ? issue.culprit : undefined;
  const webUrl =
    "web_url" in issue && issue.web_url
      ? issue.web_url
      : "https://klarpakke.sentry.io";

  const cardName = `🚨 SENTRY: ${title}`;
  const cardDesc = [
    `**Nivå:** ${level}`,
    culprit ? `**Hvor:** ${culprit}` : null,
    `**Tid:** ${new Date().toISOString()}`,
    `**Lenke:** ${webUrl}`,
    "",
    "Automatisk opprettet fra Sentry webhook.",
  ]
    .filter(Boolean)
    .join("\n");

  const posted = await postTrelloCard(cardName, cardDesc);

  return NextResponse.json({ ok: true, trello: posted });
}
