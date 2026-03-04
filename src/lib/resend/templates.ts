/**
 * Resend Email Templates for Auto Trade Notifications
 * Norwegian language email templates
 */

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Hjelpefunksjoner
const formatCurrency = (amount: number, currency = 'USDT'): string => {
  return `${amount.toFixed(2)} ${currency}`;
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('no-NO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Base email wrapper
const wrapEmail = (content: string, title: string): { html: string; text: string } => {
  const html = `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
    .highlight { background: #dbeafe; padding: 2px 6px; border-radius: 4px; }
    .success { color: #059669; }
    .error { color: #dc2626; }
    .warning { color: #d97706; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 Klarpakke Auto Trade</h1>
    <p>${title}</p>
  </div>
  <div class="content">
    ${content}
    <p style="margin-top: 30px;">
      <a href="https://www.klarpakke.no/dashboard/auto-trade" class="button">Åpne Auto Trade Dashboard</a>
    </p>
  </div>
  <div class="footer">
    <p>Du mottar denne e-posten fordi du har aktivert Auto Trading på Klarpakke.</p>
    <p>© 2026 Klarpakke. Alle rettigheter reservert.</p>
    <p><a href="https://www.klarpakke.no/innstillinger">Administrer varselinnstillinger</a></p>
  </div>
</body>
</html>
  `.trim();

  // Plain text version
  const text = `
${title}
${'='.repeat(title.length)}

${content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}

Åpne Auto Trade Dashboard:
https://www.klarpakke.no/dashboard/auto-trade

---
Du mottar denne e-posten fordi du har aktivert Auto Trading på Klarpakke.
© 2026 Klarpakke. Alle rettigheter reservert.
Administrer varselinnstillinger: https://www.klarpakke.no/innstillinger
  `.trim();

  return { html, text };
};

// 1. Strategi aktivert
export const strategyActivated = (params: {
  strategyName: string;
  strategyType: string;
  tradingMode: 'paper' | 'live';
  symbol: string;
  capitalAllocation: number;
}): EmailTemplate => {
  const { strategyName, strategyType, tradingMode, symbol, capitalAllocation } = params;
  const modeText = tradingMode === 'live' ? '🔴 Live Trading' : '🟡 Paper Trading';
  
  const content = `
    <h2 class="success">✅ Strategi aktivert!</h2>
    <p>Din auto trading-strategi er nå aktiv og vil begynne å handle.</p>
    
    <table>
      <tr><th>Strategi</th><td>${strategyName}</td></tr>
      <tr><th>Type</th><td>${strategyType}</td></tr>
      <tr><th>Modus</th><td><strong>${modeText}</strong></td></tr>
      <tr><th>Symbol</th><td>${symbol}</td></tr>
      <tr><th>Kapital</th><td>${formatCurrency(capitalAllocation)}</td></tr>
    </table>
    
    <p>Du vil motta e-postvarsler når strategien utfører trades.</p>
    ${tradingMode === 'live' ? '<p class="warning">⚠️ Husk: Dette er ekte penger. Overvåk strategien jevnlig.</p>' : ''}
  `;

  const { html, text } = wrapEmail(content, 'Auto Trading Strategi Aktivert');
  return { subject: '✅ Auto Trading Strategi Aktivert', html, text };
};

// 2. Strategi deaktivert
export const strategyDeactivated = (params: {
  strategyName: string;
  reason: string;
  totalPnL?: number;
}): EmailTemplate => {
  const { strategyName, reason, totalPnL } = params;
  
  const content = `
    <h2>⏸️ Strategi deaktivert</h2>
    <p>Din auto trading-strategi har blitt deaktivert.</p>
    
    <table>
      <tr><th>Strategi</th><td>${strategyName}</td></tr>
      <tr><th>Årsak</th><td>${reason}</td></tr>
      ${totalPnL !== undefined ? `<tr><th>Total P&L</th><td class="${totalPnL >= 0 ? 'success' : 'error'}">${totalPnL >= 0 ? '+' : ''}${formatCurrency(totalPnL)}</td></tr>` : ''}
    </table>
    
    <p>Du kan aktivere strategien igjen når som helst fra dashboardet.</p>
  `;

  const { html, text } = wrapEmail(content, 'Auto Trading Strategi Deaktivert');
  return { subject: '⏸️ Auto Trading Strategi Deaktivert', html, text };
};

// 3. Trade åpnet
export const tradeOpened = (params: {
  strategyName: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  tradingMode: 'paper' | 'live';
}): EmailTemplate => {
  const { strategyName, symbol, side, entryPrice, quantity, stopLoss, takeProfit, tradingMode } = params;
  const modeText = tradingMode === 'live' ? '🔴 LIVE' : '🟡 PAPER';
  
  const content = `
    <h2 class="${side === 'BUY' ? 'success' : 'error'}">${side === 'BUY' ? '🟢' : '🔴'} Trade ${side === 'BUY' ? 'kjøpt' : 'solgt'}</h2>
    <p>En ny posisjon er åpnet.</p>
    
    <table>
      <tr><th>Modus</th><td><strong>${modeText}</strong></td></tr>
      <tr><th>Strategi</th><td>${strategyName}</td></tr>
      <tr><th>Symbol</th><td>${symbol}</td></tr>
      <tr><th>Side</th><td class="${side === 'BUY' ? 'success' : 'error'}">${side === 'BUY' ? 'KJØP' : 'SALG'}</td></tr>
      <tr><th>Entry-pris</th><td>$${entryPrice.toFixed(2)}</td></tr>
      <tr><th>Mengde</th><td>${quantity.toFixed(6)}</td></tr>
      <tr><th>Verdi</th><td>$${(entryPrice * quantity).toFixed(2)}</td></tr>
      ${stopLoss ? `<tr><th>Stop Loss</th><td class="error">$${stopLoss.toFixed(2)}</td></tr>` : ''}
      ${takeProfit ? `<tr><th>Take Profit</th><td class="success">$${takeProfit.toFixed(2)}</td></tr>` : ''}
    </table>
    
    <p style="font-size: 12px; color: #6b7280;">
      Tidspunkt: ${formatDate(new Date())}
    </p>
  `;

  const { html, text } = wrapEmail(content, 'Ny Trade Åpnet');
  return { 
    subject: `${side === 'BUY' ? '🟢' : '🔴'} Trade ${side === 'BUY' ? 'kjøpt' : 'solgt'}: ${symbol} (${modeText})`, 
    html, 
    text 
  };
};

// 4. Trade lukket
export const tradeClosed = (params: {
  strategyName: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnlUsdt: number;
  pnlPercent: number;
  exitReason: string;
  tradingMode: 'paper' | 'live';
}): EmailTemplate => {
  const { strategyName, symbol, side, entryPrice, exitPrice, quantity, pnlUsdt, pnlPercent, exitReason, tradingMode } = params;
  const isProfit = pnlUsdt >= 0;
  const modeText = tradingMode === 'live' ? '🔴 LIVE' : '🟡 PAPER';
  
  const content = `
    <h2 class="${isProfit ? 'success' : 'error'}">${isProfit ? '✅' : '❌'} Trade lukket - ${isProfit ? 'PROFIT' : 'LOSS'}</h2>
    <p>En posisjon er lukket.</p>
    
    <table>
      <tr><th>Modus</th><td><strong>${modeText}</strong></td></tr>
      <tr><th>Strategi</th><td>${strategyName}</td></tr>
      <tr><th>Symbol</th><td>${symbol}</td></tr>
      <tr><th>Entry-pris</th><td>$${entryPrice.toFixed(2)}</td></tr>
      <tr><th>Exit-pris</th><td>$${exitPrice.toFixed(2)}</td></tr>
      <tr><th>Mengde</th><td>${quantity.toFixed(6)}</td></tr>
      <tr><th>Exit-årsak</th><td>${exitReason}</td></tr>
      <tr style="background: ${isProfit ? '#d1fae5' : '#fee2e2'};">
        <th>P&L</th>
        <td class="${isProfit ? 'success' : 'error'}">
          <strong>${isProfit ? '+' : ''}${formatCurrency(pnlUsdt)} (${isProfit ? '+' : ''}${pnlPercent.toFixed(2)}%)</strong>
        </td>
      </tr>
    </table>
    
    <p style="font-size: 12px; color: #6b7280;">
      Tidspunkt: ${formatDate(new Date())}
    </p>
  `;

  const { html, text } = wrapEmail(content, 'Trade Lukket');
  return { 
    subject: `${isProfit ? '✅ PROFIT' : '❌ LOSS'}: ${symbol} ${formatCurrency(pnlUsdt)} (${modeText})`, 
    html, 
    text 
  };
};

// 5. Circuit breaker triggered
export const circuitBreakerTriggered = (params: {
  strategyName: string;
  triggerType: 'daily_loss_limit' | 'consecutive_losses' | 'high_volatility' | 'flash_crash';
  triggerValue: string;
  pauseDuration: string;
}): EmailTemplate => {
  const { strategyName, triggerType, triggerValue, pauseDuration } = params;
  
  const triggerNames: Record<string, string> = {
    daily_loss_limit: 'Daglig tapsgrense nådd',
    consecutive_losses: 'Påfølgende tap',
    high_volatility: 'Høy volatilitet',
    flash_crash: 'Flash crash detected',
  };
  
  const content = `
    <h2 class="warning">⚠️ Circuit Breaker Aktivert</h2>
    <p>Auto trading har blitt midlertidig stoppet for å beskytte kapitalen din.</p>
    
    <table>
      <tr><th>Strategi</th><td>${strategyName}</td></tr>
      <tr><th>Trigger</th><td class="warning">${triggerNames[triggerType] || triggerType}</td></tr>
      <tr><th>Verdi</th><td>${triggerValue}</td></tr>
      <tr><th>Pause-varighet</th><td>${pauseDuration}</td></tr>
    </table>
    
    <p>Dette er en sikkerhetsmekanisme for å forhindre store tap. Trading vil gjenopptas automatisk etter pausen.</p>
    <p class="warning">💡 Tips: Gå gjennom strategien din i dashboardet for å se hva som utløste triggeren.</p>
  `;

  const { html, text } = wrapEmail(content, 'Circuit Breaker Aktivert');
  return { subject: '⚠️ Circuit Breaker Aktivert - Trading Paused', html, text };
};

// 6. Daglig P&L oppsummering
export const dailyPnLSummary = (params: {
  date: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  totalPnLPercent: number;
  openPositions: number;
  strategies: Array<{ name: string; pnl: number }>;
}): EmailTemplate => {
  const { date, totalTrades, winningTrades, losingTrades, totalPnL, totalPnLPercent, openPositions, strategies } = params;
  const isProfit = totalPnL >= 0;
  
  const strategyRows = strategies
    .sort((a, b) => b.pnl - a.pnl)
    .map(s => `<tr><td>${s.name}</td><td class="${s.pnl >= 0 ? 'success' : 'error'}">${s.pnl >= 0 ? '+' : ''}${formatCurrency(s.pnl)}</td></tr>`)
    .join('');
  
  const content = `
    <h2>Daglig Trading Oppsummering</h2>
    <p>${formatDate(date)}</p>
    
    <table>
      <tr style="background: ${isProfit ? '#d1fae5' : '#fee2e2'};">
        <th>Total P&L</th>
        <td class="${isProfit ? 'success' : 'error'}">
          <strong style="font-size: 24px;">${isProfit ? '+' : ''}${formatCurrency(totalPnL)} (${isProfit ? '+' : ''}${totalPnLPercent.toFixed(2)}%)</strong>
        </td>
      </tr>
      <tr><th>Antall trades</th><td>${totalTrades}</td></tr>
      <tr><th>Vinnende</th><td class="success">${winningTrades} (${totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : 0}%)</td></tr>
      <tr><th>Tapende</th><td class="error">${losingTrades}</td></tr>
      <tr><th>Åpne posisjoner</th><td>${openPositions}</td></tr>
    </table>
    
    <h3>P&L per strategi</h3>
    <table>
      <thead>
        <tr><th>Strategi</th><th>P&L</th></tr>
      </thead>
      <tbody>
        ${strategyRows}
      </tbody>
    </table>
  `;

  const { html, text } = wrapEmail(content, 'Daglig Trading Oppsummering');
  return { 
    subject: `${isProfit ? '📈' : '📉'} Daglig Oppsummering: ${isProfit ? '+' : ''}${formatCurrency(totalPnL)}`, 
    html, 
    text 
  };
};

// 7. Velkomst-email for Auto Trade
export const autoTradeWelcome = (params: {
  userName: string;
  tier: string;
  maxStrategies: number;
  allowLive: boolean;
}): EmailTemplate => {
  const { userName, tier, maxStrategies, allowLive } = params;
  
  const content = `
    <h2>🎉 Velkommen til Auto Trading!</h2>
    <p>Hei ${userName},</p>
    <p>Du har nå tilgang til Klarpakke Auto Trading! La robotene jobbe for deg mens du fokuserer på andre ting.</p>
    
    <h3>Dine tjenester:</h3>
    <table>
      <tr><th>Abonnement</th><td>${tier}</td></tr>
      <tr><th>Maks strategier</th><td>${maxStrategies === -1 ? 'Ubegrenset' : maxStrategies}</td></tr>
      <tr><th>Paper Trading</th><td class="success">✅ Inkludert</td></tr>
      <tr><th>Live Trading</th><td class="${allowLive ? 'success' : 'error'}">${allowLive ? '✅ Inkludert' : '❌ Krever Bachelor+'}</td></tr>
    </table>
    
    <h3>Hvordan komme i gang:</h3>
    <ol>
      <li>Koble til din Binance-konto (API-nøkler)</li>
      <li>Velg en strategi (DCA, Trend, Multi-Signal, etc.)</li>
      <li>Start med Paper Trading for å teste</li>
      <li>Aktiver Live Trading når du er klar</li>
    </ol>
    
    <p>💡 <strong>Tips:</strong> Start alltid med Paper Trading for å bli kjent med strategien før du handler med ekte penger.</p>
    
    <p>Har du spørsmål? Svar på denne e-posten eller kontakt oss på <a href="mailto:post@klarpakke.no">post@klarpakke.no</a>.</p>
  `;

  const { html, text } = wrapEmail(content, 'Velkommen til Auto Trading!');
  return { subject: '🎉 Velkommen til Klarpakke Auto Trading!', html, text };
};

// Eksportér alle templates
export const emailTemplates = {
  strategyActivated,
  strategyDeactivated,
  tradeOpened,
  tradeClosed,
  circuitBreakerTriggered,
  dailyPnLSummary,
  autoTradeWelcome,
};

export default emailTemplates;
