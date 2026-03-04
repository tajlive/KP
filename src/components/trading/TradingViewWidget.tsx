'use client'

import React from 'react';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

interface TradingViewWidgetProps {
    symbol: string;
    theme?: "light" | "dark";
    height?: number;
}

export default function TradingViewWidget({ symbol, theme = "dark", height = 400 }: TradingViewWidgetProps) {
    // Map our internal symbol (BTCUSDT) to TradingView symbol (BINANCE:BTCUSDT)
    const tvSymbol = `BINANCE:${symbol}`;

    return (
        <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900" style={{ height }}>
            <AdvancedRealTimeChart
                symbol={tvSymbol}
                theme={theme}
                autosize
                hide_side_toolbar={false}
                allow_symbol_change={false}
                container_id={`tv-chart-${symbol}`}
            />
        </div>
    );
}
