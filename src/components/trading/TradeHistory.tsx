'use client';

import { useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import { ArrowUpRight, ArrowDownRight, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TradeHistory() {
  const { trades } = useTradingStore();
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');

  const filteredTrades = trades.filter((trade) => {
    if (filter === 'all') return true;
    return trade.type === filter;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('no-NO', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Handelshistorikk
          </h3>
          <div className="flex items-center gap-2">
            {/* Filter */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['all', 'buy', 'sell'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    filter === f
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  {f === 'all' ? 'Alle' : f === 'buy' ? 'Kjøp' : 'Salg'}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Trades List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredTrades.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Ingen handler å vise</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredTrades.slice(0, 50).map((trade) => (
              <div
                key={trade.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        trade.type === 'buy'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}
                    >
                      {trade.type === 'buy' ? (
                        <ArrowUpRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {trade.symbol}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            trade.side === 'open'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                          }`}
                        >
                          {trade.side === 'open' ? 'Åpne' : 'Lukke'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatTime(trade.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono font-medium text-gray-900 dark:text-white">
                      {trade.quantity.toFixed(4)} @ ${trade.price.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end gap-2 text-sm">
                      <span className="text-gray-500">
                        Total: ${trade.total.toLocaleString()}
                      </span>
                      {trade.pnl !== undefined && (
                        <span
                          className={`font-bold ${
                            trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {trade.pnl >= 0 ? '+' : ''}
                          ${trade.pnl.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredTrades.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Viser {Math.min(filteredTrades.length, 50)} av {filteredTrades.length} handler
            </span>
            {filteredTrades.length > 50 && (
              <button className="text-blue-600 hover:underline">
                Vis alle
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
