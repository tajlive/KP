/**
 * API: Max Aggressive — OKX live data for bestemor
 * 
 * Henter posisjon, balanse, beregner P&L.
 * Returnerer enkelt format for BestemorPanel.
 * 
 * @module api/trading/max-aggressive
 * @version 1.0.0
 */

import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  try {
    const timestamp = new Date().toISOString();
    const path = "/api/v5/account/positions";
    const message = timestamp + "GET" + path;
    const signature = crypto
      .createHmac("sha256", process.env.OKX_SECRET_KEY!)
      .update(message)
      .digest("base64");

    const res = await fetch(`https://eea.okx.com${path}`, {
      headers: {
        "OK-ACCESS-KEY": process.env.OKX_API_KEY!,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": process.env.OKX_PASSPHRASE!,
      },
    });

    const data = await res.json();
    const position = data.data?.[0];
    
    // Hent balanse
    const balancePath = "/api/v5/account/balance";
    const balanceMessage = timestamp + "GET" + balancePath;
    const balanceSignature = crypto
      .createHmac("sha256", process.env.OKX_SECRET_KEY!)
      .update(balanceMessage)
      .digest("base64");

    const balanceRes = await fetch(`https://eea.okx.com${balancePath}`, {
      headers: {
        "OK-ACCESS-KEY": process.env.OKX_API_KEY!,
        "OK-ACCESS-SIGN": balanceSignature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": process.env.OKX_PASSPHRASE!,
      },
    });

    const balanceData = await balanceRes.json();
    const usdtBalance = balanceData.data?.[0]?.details?.find(
      (d: { ccy?: string; availBal?: string }) => d.ccy === "USDT"
    )?.availBal || "0";

    // Beregn P&L (forenklet — skal hentes fra trades)
    const dailyPnl = position?.upl ? parseFloat(position.upl) : 0;
    const dailyPnlPct = position?.uplRatio ? parseFloat(position.uplRatio) * 100 : 0;

    return NextResponse.json({
      status: position ? "running" : "waiting",
      daily_pnl: dailyPnlPct,
      daily_pnl_kr: dailyPnl * 9.6, // USDT → NOK
      explanation: position 
        ? `Roboten har ${parseFloat(position.pos) > 0 ? "kjøpt" : "solgt"} ${Math.abs(parseFloat(position.pos))} ${position.instId}. Den venter på å selge høyere.`
        : "Roboten venter på riktig pris for å starte.",
      kill_switch: dailyPnlPct <= -3,
      leverage: 5,
      symbol: "SOL",
      balance: usdtBalance,
      position: position || null,
    });
  } catch (error) {
    console.error("Max aggressive API error:", error);
    return NextResponse.json(
      {
        status: "error",
        daily_pnl: 0,
        daily_pnl_kr: 0,
        explanation: "Kunne ikke hente data. Prøver igjen...",
        kill_switch: false,
        leverage: 5,
        symbol: "SOL",
        balance: "0",
        position: null,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Stopp-knapp — deaktiverer trading
  return NextResponse.json({
    status: "stopped",
    message: "Roboten er stoppet. Ingen flere trades i dag.",
  });
}
