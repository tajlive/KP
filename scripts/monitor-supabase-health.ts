/**
 * Supabase Health Monitor — sjekker DB hvert 5. minutt
 * Logger til bot_health + sender e-post ved timeout
 * 
 * Kostnad: 0 kr (bruker eksisterende cron-infrastruktur)
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;

const HEALTH_CHECK_TIMEOUT_MS = 5000; // 5 sekunder
const ALERT_EMAIL = "tomarnejensen@gmail.com";

interface HealthStatus {
  ok: boolean;
  latency_ms: number;
  error?: string;
}

async function checkSupabaseHealth(): Promise<HealthStatus> {
  const start = Date.now();
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { 
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    
    const latency = Date.now() - start;
    
    if (!res.ok) {
      return { ok: false, latency_ms: latency, error: `HTTP ${res.status}` };
    }
    
    return { ok: true, latency_ms: latency };
  } catch (err) {
    const latency = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, latency_ms: latency, error };
  }
}

async function logHealthToDb(status: HealthStatus) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  await supabase.from("bot_health").insert({
    service: "supabase",
    status: status.ok ? "healthy" : "unhealthy",
    latency_ms: status.latency_ms,
    error_message: status.error ?? null,
    checked_at: new Date().toISOString(),
  });
}

async function sendAlert(status: HealthStatus) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY ikke satt — kan ikke sende varsel");
    return;
  }

  const subject = status.ok 
    ? "✅ Supabase er oppe igjen" 
    : "🔴 Supabase timeout";
    
  const html = `
    <h2>${subject}</h2>
    <p><strong>Tidspunkt:</strong> ${new Date().toISOString()}</p>
    <p><strong>Latency:</strong> ${status.latency_ms}ms</p>
    ${status.error ? `<p><strong>Feil:</strong> ${status.error}</p>` : ""}
    <p><a href="https://status.supabase.com">Sjekk Supabase status</a></p>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Klarpakke Monitor <monitor@klarpakke.no>",
      to: [ALERT_EMAIL],
      subject,
      html,
    }),
  });
}

async function main() {
  const status = await checkSupabaseHealth();
  
  console.log(`[${new Date().toISOString()}] Supabase health:`, 
    status.ok ? "✅ OK" : "🔴 FAIL", 
    `(${status.latency_ms}ms)`
  );
  
  // Logg til DB (for historikk)
  await logHealthToDb(status);
  
  // Send varsel KUN ved feil (ikke spam ved OK)
  if (!status.ok) {
    await sendAlert(status);
  }
  
  // Exit 1 ved feil (cron markerer som failed)
  process.exit(status.ok ? 0 : 1);
}

main().catch((err) => {
  console.error("Health check failed:", err);
  process.exit(1);
});
