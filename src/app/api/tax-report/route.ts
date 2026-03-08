/**
 * Tax Report API for Norwegian Users
 * Generates tax reports compatible with Norwegian Tax Administration (Skatteetaten)
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Mapped trade type from auto_trades table
interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: number | null;
  entry_price: number | null;
  exit_price: number | null;
  executed_at: string | null;
  commission: number | null;
  realized_pnl: number | null;
}

// Helper to get price/total/fees from database trade
function getTradePrice(trade: Trade): number {
  return trade.entry_price ?? trade.exit_price ?? 0;
}

function getTradeTotal(trade: Trade): number {
  const price = getTradePrice(trade);
  return (trade.quantity ?? 0) * price;
}

function getTradeFees(trade: Trade): number {
  return trade.commission ?? 0;
}

interface TaxReportData {
  year: number;
  userId: string;
  userEmail?: string;
  totalTrades: number;
  totalBuyVolume: number;
  totalSellVolume: number;
  realizedProfitLoss: number;
  totalFees: number;
  tradesBySymbol: Record<string, {
    symbol: string;
    buyCount: number;
    sellCount: number;
    realizedProfitLoss: number;
  }>;
  quarterlyBreakdown: {
    q1: { profitLoss: number; trades: number };
    q2: { profitLoss: number; trades: number };
    q3: { profitLoss: number; trades: number };
    q4: { profitLoss: number; trades: number };
  };
  skatteetatenFormat: {
    year: number;
    formData: {
      post3_1_1: number;
      post3_1_2: number;
      post3_1_10: number;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const format = searchParams.get('format') || 'json'; // json, csv, pdf, html

    const supabase = (await createClient()) as any;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user email
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('user_id', user.id)
      .single();

    // Fetch trades for the year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data: trades, error: tradesError } = await supabase
      .from('auto_trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('executed_at', startDate)
      .lte('executed_at', endDate)
      .order('executed_at', { ascending: true });

    if (tradesError) {
      console.error('Error fetching trades:', tradesError);
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
    }

    // Calculate tax report data
    const report = calculateTaxReport(trades || [], year, user.id, userData?.email);

    // Return in requested format
    if (format === 'csv') {
      const csv = generateCSV(report, trades || []);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="skatterapport-${year}.csv"`,
        },
      });
    }

    if (format === 'html') {
      const html = generateHTML(report, trades || []);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="skatterapport-${year}.html"`,
        },
      });
    }

    if (format === 'pdf') {
      // Generate HTML and return with PDF header for browser print-to-PDF
      const html = generatePrintableHTML(report, trades || []);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    return NextResponse.json(report);

  } catch (error) {
    console.error('Tax report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateTaxReport(trades: Trade[], year: number, userId: string, userEmail?: string): TaxReportData {
  // Group trades by symbol for FIFO calculation
  const symbolTrades: Record<string, Trade[]> = {};

  trades.forEach(trade => {
    if (!symbolTrades[trade.symbol]) {
      symbolTrades[trade.symbol] = [];
    }
    symbolTrades[trade.symbol].push(trade);
  });

  // Calculate using FIFO method (Norwegian standard)
  const tradesBySymbol: Record<string, { symbol: string; buyCount: number; sellCount: number; realizedProfitLoss: number }> = {};
  let totalRealizedProfitLoss = 0;
  let totalFees = 0;

  Object.entries(symbolTrades).forEach(([symbol, symbolTradeList]) => {
    const buyQueue: { quantity: number; price: number; fees: number }[] = [];
    let symbolRealizedPnL = 0;
    let buyCount = 0;
    let sellCount = 0;

    symbolTradeList.forEach(trade => {
      const fees = getTradeFees(trade);
      const price = getTradePrice(trade);
      const quantity = trade.quantity ?? 0;
      totalFees += fees;

      if (trade.side === 'buy') {
        buyQueue.push({
          quantity,
          price,
          fees,
        });
        buyCount++;
      } else {
        sellCount++;
        let remainingQty = quantity;
        let costBasis = 0;

        // FIFO calculation
        while (remainingQty > 0 && buyQueue.length > 0) {
          const buy = buyQueue[0];
          const qtyToUse = Math.min(remainingQty, buy.quantity);

          costBasis += qtyToUse * buy.price + (buy.fees * (qtyToUse / buy.quantity));
          buy.quantity -= qtyToUse;
          remainingQty -= qtyToUse;

          if (buy.quantity === 0) {
            buyQueue.shift();
          }
        }

        const proceeds = quantity * price - fees;
        const realizedPnL = proceeds - costBasis;
        symbolRealizedPnL += realizedPnL;
      }
    });

    tradesBySymbol[symbol] = {
      symbol,
      buyCount,
      sellCount,
      realizedProfitLoss: symbolRealizedPnL,
    };

    totalRealizedProfitLoss += symbolRealizedPnL;
  });

  // Quarterly breakdown
  const quarterlyBreakdown = {
    q1: { profitLoss: 0, trades: 0 },
    q2: { profitLoss: 0, trades: 0 },
    q3: { profitLoss: 0, trades: 0 },
    q4: { profitLoss: 0, trades: 0 },
  };

  trades.forEach(trade => {
    if (!trade.executed_at) return;
    const month = new Date(trade.executed_at).getMonth();
    const quarter = Math.floor(month / 3) + 1;
    const qKey = `q${quarter}` as keyof typeof quarterlyBreakdown;

    quarterlyBreakdown[qKey].trades++;

    if (trade.side === 'sell') {
      quarterlyBreakdown[qKey].profitLoss += getTradeTotal(trade);
    }
  });

  // Calculate total volumes
  const totalBuyVolume = trades
    .filter(t => t.side === 'buy')
    .reduce((sum, t) => sum + getTradeTotal(t), 0);

  const totalSellVolume = trades
    .filter(t => t.side === 'sell')
    .reduce((sum, t) => sum + getTradeTotal(t), 0);

  return {
    year,
    userId,
    userEmail,
    totalTrades: trades.length,
    totalBuyVolume,
    totalSellVolume,
    realizedProfitLoss: totalRealizedProfitLoss,
    totalFees,
    tradesBySymbol,
    quarterlyBreakdown,
    skatteetatenFormat: {
      year,
      formData: {
        post3_1_1: Math.max(0, totalRealizedProfitLoss),
        post3_1_2: Math.abs(Math.min(0, totalRealizedProfitLoss)),
        post3_1_10: totalRealizedProfitLoss,
      },
    },
  };
}

function generateCSV(report: TaxReportData, trades: Trade[]): string {
  const headers = [
    'Dato',
    'Tid',
    'Valuta/Asset',
    'Type',
    'Antall',
    'Kurs',
    'Beløp',
    'Gebyr',
    'Realisert Gevinst/Tap',
    'Notater',
  ].join(';');

  const rows = trades.map(trade => {
    const date = trade.executed_at ? new Date(trade.executed_at) : new Date();
    const dateStr = date.toLocaleDateString('no-NO');
    const timeStr = date.toLocaleTimeString('no-NO');

    return [
      dateStr,
      timeStr,
      trade.symbol,
      trade.side === 'buy' ? 'Kjøp' : 'Salg',
      trade.quantity ?? 0,
      getTradePrice(trade),
      getTradeTotal(trade),
      getTradeFees(trade),
      trade.realized_pnl ?? '',
      'Klarpakke Trading',
    ].join(';');
  });

  const summaryRows = [
    '',
    'OPPSUMMERING SKATTEÅR ' + report.year,
    '',
    `Totalt antall handler;${report.totalTrades}`,
    `Kjøpsvolum;${report.totalBuyVolume.toLocaleString('no-NO')} NOK`,
    `Salgsvolum;${report.totalSellVolume.toLocaleString('no-NO')} NOK`,
    `Realisert gevinst/tap;${report.realizedProfitLoss.toLocaleString('no-NO')} NOK`,
    `Totale gebyrer;${report.totalFees.toLocaleString('no-NO')} NOK`,
    '',
    'SKATTEETATEN RF-1189 (Skjema for gevinst og tap på cryptocurrency)',
    `Post 3.1.1 - Gevinst;${report.skatteetatenFormat.formData.post3_1_1.toLocaleString('no-NO')}`,
    `Post 3.1.2 - Tap;${report.skatteetatenFormat.formData.post3_1_2.toLocaleString('no-NO')}`,
    `Post 3.1.10 - Netto;${report.skatteetatenFormat.formData.post3_1_10.toLocaleString('no-NO')}`,
  ];

  return [headers, ...rows, ...summaryRows].join('\n');
}

function generateHTML(report: TaxReportData, trades: Trade[]): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('no-NO', { style: 'currency', currency: 'NOK' }).format(amount);

  return `<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <title>Skatterapport ${report.year}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #1a365d; border-bottom: 3px solid #3182ce; padding-bottom: 10px; }
        h2 { color: #2c5282; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background-color: #3182ce; color: white; }
        .summary { background-color: #ebf8ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .skatteetaten { background-color: #faf5ff; padding: 20px; border-radius: 8px; border-left: 4px solid #805ad5; }
        .positive { color: #38a169; }
        .negative { color: #e53e3e; }
    </style>
</head>
<body>
    <h1>🧾 Skatterapport ${report.year}</h1>
    <p>Generert: ${new Date().toLocaleDateString('no-NO')}</p>
    ${report.userEmail ? `<p>Bruker: ${report.userEmail}</p>` : ''}
    
    <div class="summary">
        <h2>📊 Oppsummering</h2>
        <p><strong>Totalt antall handler:</strong> ${report.totalTrades}</p>
        <p><strong>Kjøpsvolum:</strong> ${formatCurrency(report.totalBuyVolume)}</p>
        <p><strong>Salgsvolum:</strong> ${formatCurrency(report.totalSellVolume)}</p>
        <p><strong>Realisert gevinst/tap:</strong> <span class="${report.realizedProfitLoss >= 0 ? 'positive' : 'negative'}">${formatCurrency(report.realizedProfitLoss)}</span></p>
        <p><strong>Totale gebyrer:</strong> ${formatCurrency(report.totalFees)}</p>
    </div>

    <div class="skatteetaten">
        <h2>🇳🇴 Skatteetaten RF-1189</h2>
        <p><strong>Post 3.1.1 - Gevinst:</strong> ${formatCurrency(report.skatteetatenFormat.formData.post3_1_1)}</p>
        <p><strong>Post 3.1.2 - Tap:</strong> ${formatCurrency(report.skatteetatenFormat.formData.post3_1_2)}</p>
        <p><strong>Post 3.1.10 - Netto:</strong> <span class="${report.skatteetatenFormat.formData.post3_1_10 >= 0 ? 'positive' : 'negative'}">${formatCurrency(report.skatteetatenFormat.formData.post3_1_10)}</span></p>
    </div>

    <h2>📋 Alle handler</h2>
    <table>
        <thead>
            <tr>
                <th>Dato</th>
                <th>Valuta</th>
                <th>Type</th>
                <th>Antall</th>
                <th>Kurs</th>
                <th>Beløp</th>
            </tr>
        </thead>
        <tbody>
            ${trades.map(t => `
                <tr>
                    <td>${t.executed_at ? new Date(t.executed_at).toLocaleDateString('no-NO') : '-'}</td>
                    <td>${t.symbol}</td>
                    <td>${t.side === 'buy' ? 'Kjøp' : 'Salg'}</td>
                    <td>${t.quantity ?? 0}</td>
                    <td>${formatCurrency(getTradePrice(t))}</td>
                    <td>${formatCurrency(getTradeTotal(t))}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px;">
        <p>Generert av Klarpakke - Norges første krypto-universitet</p>
        <p>For spørsmål om skatterapporten, kontakt post@klarpakke.no</p>
    </footer>
</body>
</html>`;
}

function generatePrintableHTML(report: TaxReportData, trades: Trade[]): string {
  return generateHTML(report, trades) + `
<script>
    window.onload = function() {
        setTimeout(function() {
            window.print();
        }, 500);
    };
</script>`;
}
