/**
 * Deploy Status Notification
 * Sendes webhook til Slack ved deploy-feil eller post-deploy health-check feil.
 *
 * Bruk: npx tsx scripts/notify-deploy-status.ts [--status=error|success] [--url=<deploy_url>]
 * Miljø: SLACK_DEPLOY_WEBHOOK_URL
 */

const SLACK_WEBHOOK = process.env.SLACK_DEPLOY_WEBHOOK_URL;

function getArgs() {
  const statusArg = process.argv.find((a) => a.startsWith("--status="));
  const urlArg = process.argv.find((a) => a.startsWith("--url="));
  return {
    status: statusArg?.replace("--status=", "") || "unknown",
    url: urlArg?.replace("--url=", "") || "https://www.klarpakke.no",
  };
}

async function checkHealth(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/health`, { signal: AbortSignal.timeout(15000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function notifySlack(status: string, url: string) {
  if (!SLACK_WEBHOOK) {
    console.warn("[notify-deploy-status] SLACK_DEPLOY_WEBHOOK_URL ikke satt — skipper varsling");
    return;
  }

  const timestamp = new Date().toISOString();
  const isError = status === "error" || status === "failure";
  const healthOk = isError ? false : await checkHealth(url);

  if (!isError && !healthOk) {
    console.log("[notify-deploy-status] /api/health returnerte ikke 200 — sender feilvarsel");
  }

  const shouldNotify = isError || !healthOk;
  if (!shouldNotify) {
    console.log("[notify-deploy-status] Ingen varsling nødvendig");
    return;
  }

  const payload = {
    text: `🚨 Klarpakke deploy FEILET — ${timestamp} — ${url}`,
  };

  const res = await fetch(SLACK_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("[notify-deploy-status] Kunne ikke sende Slack-varsel:", res.status);
    process.exit(1);
  } else {
    console.log("[notify-deploy-status] Slack-varsel sendt");
  }
}

async function main() {
  const args = getArgs();
  await notifySlack(args.status, args.url);
}

main().catch((err) => {
  console.error("[notify-deploy-status] Feil:", err);
  process.exit(1);
});
