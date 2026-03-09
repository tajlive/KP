'use client';

import { useTradingStore } from '@/store/tradingStore';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PositionsTable() {
  const { positions, closePosition, marketData } = useTradingStore();

  if (positions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Ingen åpne posisjoner
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Start trading ved å åpne din første posisjon
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Åpne Posisjoner ({positions.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Symbol
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Side
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Størrelse
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Entry
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Nåværende
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                P&L
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Handling
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {positions.map((position, index) => (
              <motion.tr
                key={position.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {position.symbol}
                    </span>
                    <span className="text-xs text-gray-500">
                      {position.leverage}x
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                      position.side === 'long'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                    }`}
                  >
                    {position.side === 'long' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {position.side.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="font-mono text-gray-900 dark:text-white">
                    {(position.quantity ?? 0).toFixed(4)}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="font-mono text-gray-600 dark:text-gray-400">
                    ${position.entryPrice.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <motion.span
                    key={position.currentPrice}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="font-mono font-medium text-gray-900 dark:text-white"
                  >
                    ${position.currentPrice.toLocaleString()}
                  </motion.span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div
                    className={`font-mono font-bold ${
                      position.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {position.pnl >= 0 ? '+' : ''}
                    ${(position.pnl ?? 0).toFixed(2)}
                    <span className="text-xs ml-1">
                      ({position.pnlPercent >= 0 ? '+' : ''}
                      {(position.pnlPercent ?? 0).toFixed(2)}%)
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => closePosition(position.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Lukk
                  </Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total P&L */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Total Urealisert P&L
          </span>
          <span
            className={`text-xl font-bold font-mono ${
              positions.reduce((sum, p) => sum + p.pnl, 0) >= 0
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {positions.reduce((sum, p) => sum + p.pnl, 0) >= 0 ? '+' : ''}
            ${positions.reduce((sum, p) => sum + p.pnl, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
