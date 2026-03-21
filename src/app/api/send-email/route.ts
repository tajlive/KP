import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { getErrorMessage } from "@/lib/utils/error";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/** Vennlig, konsistent innpakning for admin-utsendelser via Resend. */
function wrapAdminEmailHtml(innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Klarpakke</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e2e8f0;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 8px;font-size:18px;font-weight:600;color:#f8fafc;">Klarpakke</td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-size:15px;color:#cbd5e1;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;font-size:13px;color:#94a3b8;border-top:1px solid #334155;padding-top:20px;">
              Med vennlig hilsen<br />
              <span style="color:#e2e8f0;">Klarpakke</span><br />
              <a href="https://www.klarpakke.no" style="color:#38bdf8;text-decoration:none;">klarpakke.no</a>
            </td>
          </tr>
        </table>
        <p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#64748b;text-align:center;">
          Du mottar denne e-posten fordi vi har en aktiv relasjon til deg eller fordi en administrator har sendt deg en melding fra Klarpakke.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAccess();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { data, error } = await resend.emails.send({
      from: "Klarpakke <post@klarpakke.no>",
      to: [to],
      subject: subject,
      html: wrapAdminEmailHtml(String(html)),
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Send email error:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
