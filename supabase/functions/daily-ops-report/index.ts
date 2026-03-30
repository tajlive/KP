// ═══════════════════════════════════════════════════════════════
// KLARPAKKE — Daily Operations Report Edge Function
// Kjører kl 07:00 CET, sender e-post med daglig rapport
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2";

interface DailyReportData {
  date: string;
  activeUsers: {
    paperTrading: number;
    autoTrading: number;
    totalActive: number;
  };
  aiSignals: {
    total: number;
    buy: number;
    sell: number;
    hold: number;
    avgConfidence: number;
  };
  failedTrades: {
    count: number;
    last24h: number;
    errorTypes: Record<string, number>;
  };
  subscriptions: {
    active: number;
    newToday: number;
    cancelled: number;
  };
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const resend = new Resend(RESEND_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  // Verify CRON_SECRET for security
  const authHeader = req.headers.get("authorization");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const report = await generateDailyReport();
    const html = generateEmailHtml(report);
    
    await resend.emails.send({
      from: "Klarpakke Ops <ops@klarpakke.no>",
      to: ["ops@klarpakke.no"],
      subject: `📊 Daglig rapport — ${report.date}`,
      html,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Daily report sent" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Daily Ops Report] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function generateDailyReport(): Promise<DailyReportData> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = today.toISOString().split("T")[0];
  const yesterdayIso = yesterday.toISOString();

  // 1. Aktive brukere
  const { data: activePaperUsers } = await supabase
    .from("paper_trading_sessions")
    .select("user_id", { count: "exact", head: true })
    .gte("created_at", yesterdayIso)
    .eq("is_active", true);

  const { data: activeAutoUsers } = await supabase
    .from("auto_trade_log")
    .select("user_id", { count: "exact", head: true })
    .gte("created_at", yesterdayIso)
    .not("user_id", "is", null);

  // 2. AI-signaler siste 24t
  const { data: signals } = await supabase
    .from("trading_signals")
    .select("decision, confidence")
    .gte("created_at", yesterdayIso);

  const signalStats = {
    total: signals?.length || 0,
    buy: signals?.filter((s) => s.decision === "BUY").length || 0,
    sell: signals?.filter((s) => s.decision === "SELL").length || 0,
    hold: signals?.filter((s) => s.decision === "HOLD").length || 0,
    avgConfidence: signals?.length
      ? signals.reduce((acc, s) => acc + (s.confidence || 0), 0) / signals.length
      : 0,
  };

  // 3. Feilede trades siste time
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: failedTrades, error: failedError } = await supabase
    .from("auto_trade_log")
    .select("error_message, status, created_at")
    .eq("status", "failed")
    .gte("created_at", oneHourAgo);

  const last24hFailed = await supabase
    .from("auto_trade_log")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("created_at", yesterdayIso);

  // Telle feiltyper
  const errorTypes: Record<string, number> = {};
  failedTrades?.forEach((trade) => {
    const errorType = trade.error_message?.split(":")[0] || "Unknown";
    errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
  });

  // 4. Abonnementer
  const { count: activeSubs } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const { count: newSubs } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .gte("created_at", yesterdayIso);

  const { count: cancelledSubs } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "cancelled")
    .gte("updated_at", yesterdayIso);

  return {
    date: todayStr,
    activeUsers: {
      paperTrading: activePaperUsers?.length || 0,
      autoTrading: activeAutoUsers?.length || 0,
      totalActive: (activePaperUsers?.length || 0) + (activeAutoUsers?.length || 0),
    },
    aiSignals: signalStats,
    failedTrades: {
      count: failedTrades?.length || 0,
      last24h: last24hFailed.count || 0,
      errorTypes,
    },
    subscriptions: {
      active: activeSubs || 0,
      newToday: newSubs || 0,
      cancelled: cancelledSubs || 0,
    },
  };
}

function generateEmailHtml(report: DailyReportData): string {
  const errorTypesHtml = Object.entries(report.failedTrades.errorTypes)
    .map(([type, count]) => `<li>${type}: ${count}</li>`)
    .join("") || "<li>Ingen feil registrert</li>";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #111827; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; font-size: 18px; }
    .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
    .metric-card { background: #f9fafb; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e5e7eb; }
    .metric-value { font-size: 28px; font-weight: bold; color: #4f46e5; }
    .metric-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .alert-danger { background: #fee2e2; border-left-color: #ef4444; }
    .alert-success { background: #d1fae5; border-left-color: #10b981; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Klarpakke — Daglig Rapport</h1>
    <p><strong>Dato:</strong> ${report.date}</p>
    
    ${report.failedTrades.count > 10 
      ? `<div class="alert alert-danger">
          <strong>⚠️ Advarsel:</strong> ${report.failedTrades.count} feilede trades siste time!
         </div>` 
      : `<div class="alert alert-success">
          <strong>✅ Systemstatus:</strong> Normal drift
         </div>`
    }

    <h2>👥 Aktive Brukere</h2>
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-value">${report.activeUsers.paperTrading}</div>
        <div class="metric-label">Paper Trading</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${report.activeUsers.autoTrading}</div>
        <div class="metric-label">Auto Trading</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${report.activeUsers.totalActive}</div>
        <div class="metric-label">Totalt Aktive</div>
      </div>
    </div>

    <h2>🤖 AI Signaler (siste 24t)</h2>
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-value">${report.aiSignals.total}</div>
        <div class="metric-label">Totale Signaler</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${report.aiSignals.buy}</div>
        <div class="metric-label">Kjøp</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${report.aiSignals.sell}</div>
        <div class="metric-label">Salg</div>
      </div>
    </div>
    <p><strong>Gjennomsnittlig konfidens:</strong> ${report.aiSignals.avgConfidence.toFixed(1)}%</p>

    <h2>💳 Abonnementer</h2>
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-value">${report.subscriptions.active}</div>
        <div class="metric-label">Aktive</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${report.subscriptions.newToday}</div>
        <div class="metric-label">Nye i dag</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${report.subscriptions.cancelled}</div>
        <div class="metric-label">Kansellert</div>
      </div>
    </div>

    <h2>⚠️ Feilede Trades</h2>
    <p><strong>Siste time:</strong> ${report.failedTrades.count} | <strong>Siste 24t:</strong> ${report.failedTrades.last24h}</p>
    
    ${report.failedTrades.count > 0 ? `
    <h3>Feiltyper (siste time):</h3>
    <ul>
      ${errorTypesHtml}
    </ul>
    ` : ''}

    <div class="footer">
      <p>Denne rapporten genereres automatisk kl 07:00 CET hver dag.</p>
      <p>Dashboard: <a href="https://www.klarpakke.no/no/dashboard">Klarpakke Dashboard</a> | 
         Support: <a href="mailto:ops@klarpakke.no">ops@klarpakke.no</a></p>
    </div>
  </div>
</body>
</html>
  `;
}
