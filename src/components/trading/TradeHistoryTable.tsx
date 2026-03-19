'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface TradeRow {
  id: string;
  trading_pair: string;
  side: string;
  quantity: number;
  price: number;
  realized_pnl: number | null;
  mode: string;
  status: string;
  created_at: string;
  executed_at: string | null;
}

interface TradeHistoryTableProps {
  trades: TradeRow[];
  loading?: boolean;
  emptyMessage?: string;
  formatNOK: (n: number) => string;
}

export function TradeHistoryTable({
  trades,
  loading = false,
  emptyMessage = 'Ingen handler',
  formatNOK,
}: TradeHistoryTableProps) {
  const t = useTranslations('tradeHistory');

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString('no-NO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#0052FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t('date')}</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t('pair')}</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t('side')}</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t('quantity')}</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t('entryPrice')}</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t('pnl')}</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t('mode')}</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t('status')}</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const isBuy = String(trade.side).toUpperCase() === 'BUY';
            const pair = (trade.trading_pair ?? '').replace('USDT', '');
            const pnl = trade.realized_pnl ?? 0;
            return (
              <tr key={trade.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {formatDate(trade.created_at)}
                </td>
                <td className="px-4 py-3 font-medium text-[#0A0B0D]">{pair}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      isBuy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isBuy ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {isBuy ? t('buy') : t('sell')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums">{Number(trade.quantity).toFixed(4)}</td>
                <td className="px-4 py-3 text-sm tabular-nums">{formatNOK(trade.price)}</td>
                <td className="px-4 py-3">
                  {trade.executed_at || trade.status === 'CLOSED' ? (
                    <span className={pnl >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {pnl >= 0 ? '+' : ''}{formatNOK(pnl)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-600">
                    {trade.mode === 'live' ? t('live') : t('paper')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{trade.status ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
