/**
 * Resend email integration for Klarpakke
 * 
 * POST /api/email/send — Send transactional email
 * 
 * Bruker Resend API (re_ROTERT_2026-08-02_se-1password...) fra environment
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = "Klarpakke <heisann@klarpakke.no>";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not configured");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.replyTo || "heisann@klarpakke.no",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Resend error:", err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Send failed:", err);
    return false;
  }
}

function welcomeEmail(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0B0F19;color:#F9FAFB;font-family:system-ui,sans-serif;padding:40px 20px">
  <div style="max-width:480px;margin:0 auto">
    <h1 style="color:#0052FF;font-size:28px;margin-bottom:8px">🎉 Velkommen til Klarpakke, ${name}!</h1>
    <p style="font-size:16px;line-height:1.6;color:#9CA3AF">
      Du har fått <strong style="color:#10B981">10 000 KLT poeng</strong> — vår velkomstbonus til betatestere.
    </p>
    <div style="background:#111827;border:1px solid #1F2937;border-radius:12px;padding:24px;margin:24px 0">
      <p style="margin:0 0 12px;font-size:15px;color:#D1D5DB">🚀 <strong>Slik kommer du i gang:</strong></p>
      <ol style="color:#9CA3AF;font-size:14px;line-height:2;padding-left:20px">
        <li>Gå til <a href="https://www.klarpakke.no/no/trade" style="color:#0052FF">Trade</a> — prøv en paper trade</li>
        <li>Utforsk <a href="https://www.klarpakke.no/no/pilot" style="color:#0052FF">Pilot™</a> — la AI-en handle</li>
        <li>Se <a href="https://www.klarpakke.no/no/dashboard" style="color:#0052FF">dashboardet</a> — følg P&L og win rate</li>
      </ol>
    </div>
    <p style="font-size:14px;color:#6B7280">
      Du handler med <strong>lekepenger</strong> — 100 000 kr i virtuell kapital. Null risiko, maks læring.
    </p>
    <div style="background:#1a1f2e;border:1px solid #2d3348;border-radius:8px;padding:16px;margin-top:16px">
      <p style="margin:0;font-size:13px;color:#F59E0B">⚠️ <strong>Beta-testfase</strong></p>
      <p style="margin:8px 0 0;font-size:12px;color:#9CA3AF;line-height:1.5">
        I testperioden er kun <strong>lekepenger</strong> tilgjengelig. Du handler med ekte markedstall og vår ekte trademotor — men uten risiko. Live-handel med ekte penger åpnes etter beta.
      </p>
    </div>
    <a href="https://www.klarpakke.no/no/trade" style="display:inline-block;background:#0052FF;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:16px">
      Start trading →
    </a>
    <hr style="border-color:#1F2937;margin:32px 0 16px">
    <p style="font-size:12px;color:#4B5563">
      Klarpakke Project — Norges krypto-skole<br>
    </p>
  </div>
</body>
</html>`;
}

function tradeConfirmedEmail(name: string, symbol: string, side: string, amount: number, price: number): string {
  const sideLabel = side === "buy" ? "Kjøpte" : "Solgte";
  const color = side === "buy" ? "#10B981" : "#EF4444";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0B0F19;color:#F9FAFB;font-family:system-ui,sans-serif;padding:40px 20px">
  <div style="max-width:480px;margin:0 auto">
    <h1 style="color:#0052FF;font-size:24px;margin-bottom:16px">Trade utført ✅</h1>
    <div style="background:#111827;border:1px solid #1F2937;border-radius:12px;padding:24px;margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:18px;color:#D1D5DB">
        <span style="color:${color}">${sideLabel}</span> ${(amount / price).toFixed(6)} ${symbol.replace("USDT", "")}
      </p>
      <p style="margin:0;font-size:14px;color:#9CA3AF">
        ${amount.toLocaleString("no")} kr · 1 ${symbol.replace("USDT", "")} = ${price.toLocaleString("no")} kr
      </p>
    </div>
    <a href="https://www.klarpakke.no/no/dashboard" style="display:inline-block;background:#0052FF;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold">
      Se dashboard →
    </a>
    <hr style="border-color:#1F2937;margin:32px 0 16px">
    <p style="font-size:12px;color:#4B5563">Klarpakke Project</p>
  </div>
</body>
</html>`;
}

// ─── POST /api/email/send ───
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, ...data } = body as { type: string; [key: string]: unknown };

  let subject: string;
  let html = "";

  // Get user email
  const email = user.email || "";
  if (!email) {
    return NextResponse.json({ error: "No email found" }, { status: 400 });
  }

  // Get user name
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const name = (profile as { display_name?: string } | null)?.display_name || "Trader";

  switch (type) {
    case "welcome":
      subject = `🎉 Velkommen til Klarpakke, ${name}!`;
      html = welcomeEmail(name);
      break;

    case "trade_confirmed":
      subject = `✅ ${(data.side as string) === "buy" ? "Kjøpte" : "Solgte"} ${(data.symbol as string)?.replace("USDT", "")}`;
      html = tradeConfirmedEmail(
        name,
        data.symbol as string,
        data.side as string,
        data.amount as number,
        data.price as number,
      );
      break;

    default:
      return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
  }

  const sent = await sendEmail({ to: email, subject, html });

  return NextResponse.json({ success: sent, email });
}

// ─── GET /api/email/send — send welcome email to current user ───
export async function GET(request: Request) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = user.email || "";
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const name = (profile as { display_name?: string } | null)?.display_name || "Trader";

  const sent = await sendEmail({
    to: email,
    subject: `🎉 Velkommen til Klarpakke, ${name}!`,
    html: welcomeEmail(name),
  });

  return NextResponse.json({ success: sent, email });
}
