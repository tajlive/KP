/**
 * Sentry Webhook → Linear incident (Task 2B, 2026-08-12).
 *
 * Bakgrunn (2026-08-09): QueryClientProvider-krasj ble logget til Sentry,
 * men INGEN ble varslet — feilen ble oppdaget av brukeren i konsollen.
 * Denne webhooken gjør Sentry-feil om til et Linear-issue automatisk.
 * (Tidligere: Trello-kort i «🚨 Varsler».)
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
 * Routing: team KLA, label «incident», prosjekt «Reliability & Trading
 * Safety», prioritet fatal→urgent(1) / error→high(2). Dedup på fingerprint
 * `sentry:<issue-id>` — gjentatte events spammer ikke.
 *
 * @module api/webhooks/sentry
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { postLinearAlert, redactForLog } from "@/lib/alerts/linear-alerts";

export const runtime = "nodejs"; // @supabase/supabase-js krever process.version — krasjer i edge (500 i prod)

const LINEAR_PROJECT = "Reliability & Trading Safety";

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
      event_id?: string;
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

/** Linear-prioritet: 1=urgent (fatal), 2=high (error). */
function linearPriorityForLevel(level: string): 1 | 2 {
  return level === "fatal" ? 1 : 2;
}

/** Stabil fingerprint: issue.id → event.event_id → hash(tittel|culprit). */
function fingerprintFor(payload: SentryIssuePayload): string {
  const issue = payload.data?.issue;
  const event = payload.data?.event;
  if (issue?.id) return `sentry:${issue.id}`;
  if (event?.event_id) return `sentry:event:${event.event_id}`;
  const stable = `${issue?.title ?? event?.title ?? "ukjent"}|${
    issue?.culprit ?? event?.culprit ?? ""
  }`;
  return `sentry:hash:${crypto
    .createHash("sha256")
    .update(stable)
    .digest("hex")
    .slice(0, 16)}`;
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

  // Kun error/fatal — warning/info er for mye støy for incident-køen
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

  const description = [
    `**Nivå:** ${level}`,
    culprit ? `**Hvor:** ${culprit}` : null,
    `**Tid:** ${new Date().toISOString()}`,
    `**Lenke:** ${webUrl}`,
    "",
    "Automatisk opprettet fra Sentry webhook.",
  ]
    .filter(Boolean)
    .join("\n");

  const fingerprint = fingerprintFor(payload);

  // Fail-safe: Linear-feil skal aldri krasje webhooken — kontrollert håndtering,
  // 200 med ok:true + linear-ok:false slik at Sentry ikke retry-stormer.
  const result = await postLinearAlert({
    kind: "SENTRY",
    subject: title,
    body: description,
    fingerprint,
    priority: linearPriorityForLevel(level),
    labels: ["incident"],
    project: LINEAR_PROJECT,
  });

  if (result.ok) {
    console.info(
      redactForLog(
        `[sentry-webhook] Linear ${result.created ? "opprettet" : "gjenbrukt"}: ${
          result.identifier ?? "ukjent"
        } (fingerprint ${fingerprint})`,
      ),
    );
  } else {
    console.error(
      redactForLog(`[sentry-webhook] Linear-feil: ${result.error ?? "ukjent"}`),
    );
  }

  return NextResponse.json({ ok: true, linear: result });
}
