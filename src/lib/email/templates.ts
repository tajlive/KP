interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export function getTradingAlertEmail(data: {
  userName: string
  sessionId: string
  strategy: string
  message: string
  timestamp: string
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
          <a href="https://www.klarpakke.no/no/auto-trading" 
             style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Gå til Dashboard
          </a>
        </p>
      </div>
    `,
    text: `Trading Alert\n\nHei ${data.userName},\n\n${data.message}\n\nSesjon: ${data.sessionId}\nStrategi: ${data.strategy}\nTidspunkt: ${data.timestamp}\n\nGå til: https://www.klarpakke.no/no/auto-trading`,
  }
}

export function getDailySummaryEmail(data: {
  userName: string
  tradesCount: number
  pnl: number
  activeSessions: number
  date: string
}): EmailTemplate {
  const pnlFormatted = new Intl.NumberFormat('no-NO', {
    style: 'currency',
    currency: 'NOK',
  }).format(data.pnl)
  
  return {
    subject: `📊 Klarpakke Daglig Oppsummering - ${data.date}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Daglig Oppsummering</h2>
        <p>Hei ${data.userName},</p>
        <p>Her er ditt trading-sammendrag for ${data.date}:</p>
        <ul>
          <li><strong>Trades:</strong> ${data.tradesCount}</li>
          <li><strong>PnL:</strong> ${pnlFormatted}</li>
          <li><strong>Aktive sesjoner:</strong> ${data.activeSessions}</li>
        </ul>
        <p>
          <a href="https://www.klarpakke.no/no/dashboard">Se detaljer →</a>
        </p>
      </div>
    `,
    text: `Daglig Oppsummering - ${data.date}\n\nHei ${data.userName},\n\nTrades: ${data.tradesCount}\nPnL: ${pnlFormatted}\nAktive sesjoner: ${data.activeSessions}\n\nSe detaljer: https://www.klarpakke.no/no/dashboard`,
  }
}
