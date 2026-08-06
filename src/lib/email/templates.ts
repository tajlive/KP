interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function getTradingAlertEmail(data: {
  userName: string;
  sessionId: string;
  strategy: string;
  message: string;
  timestamp: string;
}): EmailTemplate {
  return {
    subject: `⚠️ Klarpakke Trading Alert: ${data.strategy}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Trading Alert</h2>
        <p>Hei ${data.userName},</p>
        <p><strong>${data.message}</strong></p>
        <p>
          <strong>Sesjon:</strong> ${data.sessionId}<br>
          <strong>Strategi:</strong> ${data.strategy}<br>
          <strong>Tidspunkt:</strong> ${data.timestamp}
        </p>
        <p>
          <a href="https://www.klarpakke.no/no/trade?tab=auto"             style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Gå til Dashboard
          </a>
        </p>
      </div>
    `,
    text: `Trading Alert\n\nHei ${data.userName},\n\n${data.message}\n\nSesjon: ${data.sessionId}\nStrategi: ${data.strategy}\nTidspunkt: ${data.timestamp}\n\nGå til: https://www.klarpakke.no/no/trade?tab=auto`,
  };
}

export function getDailySummaryEmail(data: {
  userName: string;
  tradesCount: number;
  pnl: number;
  /** Vinn % blant handler med avrealisert P&L (ikke-null) i perioden */
  winRatePct: number;
  activeSessions: number;
  /** Sum NOK på aktive sesjoner (kun felt som er satt i DB; unngår rå USD-tall i mail) */
  totalCapitalNok: number;
  date: string;
  periodNote: string;
}): EmailTemplate {
  const nok = new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
  });
  const pnlFormatted = nok.format(data.pnl);
  const capitalFormatted =
    data.totalCapitalNok > 0
      ? nok.format(data.totalCapitalNok)
      : "— (åpne dashboard for saldo)";

  const pnlSign = data.pnl >= 0 ? "+" : "";

  return {
    subject: `📈 Din daglige oppsummering - ${data.date}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a;">
        <h2 style="margin-bottom: 8px;">📈 Daglig Oppsummering</h2>
        <p style="color: #64748b; font-size: 14px;">${data.date}</p>
        <p>Hei ${data.userName},</p>
        <p style="font-size: 13px; color: #64748b;">${data.periodNote}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 15px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><strong>DAGENS P&amp;L</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${pnlSign}${pnlFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><strong>ANTALL HANDLER</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${data.tradesCount}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"><strong>WIN RATE</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${data.winRatePct}%</td>
          </tr>
          <tr>
            <td style="padding: 10px 0;"><strong>TOTAL KAPITAL (NOK)</strong></td>
            <td style="padding: 10px 0; text-align: right;">${capitalFormatted}</td>
          </tr>
        </table>
        <p style="font-size: 13px; color: #64748b;">Aktive sesjoner: ${data.activeSessions}</p>
        <p>
          <a href="https://www.klarpakke.no/no/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Åpne Dashboard</a>
        </p>
      </div>
    `,
    text: `Daglig oppsummering — ${data.date}\n\nHei ${data.userName},\n\n${data.periodNote}\n\nDAGENS P&L: ${pnlSign}${pnlFormatted}\nANTALL HANDLER: ${data.tradesCount}\nWIN RATE: ${data.winRatePct}%\nTOTAL KAPITAL (NOK): ${capitalFormatted}\nAktive sesjoner: ${data.activeSessions}\n\nÅpne dashboard: https://www.klarpakke.no/no/dashboard`,
  };
}
