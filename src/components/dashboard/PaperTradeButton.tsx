'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, DollarSign } from 'lucide-react';

interface Props {
  symbol: string;
  currentPrice: number;
}

export function PaperTradeButton({ symbol, currentPrice }: Props) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/paper-trading/balance');
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance.current);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const handleOpen = () => {
    fetchBalance();
    setOpen(true);
  };

  const executeTrade = async (side: 'buy' | 'sell') => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      toast.error('Vennligst angi en gyldig mengde');
      return;
    }

    const totalValue = qty * currentPrice;
    
    if (side === 'buy' && balance !== null && totalValue > balance) {
      toast.error('Ikke nok saldo for denne handelen');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/paper-trading/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          side,
          quantity: qty,
          price: currentPrice,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Handel feilet');
      }

      const data = await response.json();
      
      toast.success(
        `${side === 'buy' ? 'Kjøpt' : 'Solgt'} ${qty} ${symbol} for kr ${totalValue.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}`,
        {
          description: `Ny saldo: kr ${data.new_balance.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}`,
        }
      );
      
      setOpen(false);
      setQuantity('');
    } catch (error: any) {
      toast.error(error.message || 'Kunne ikke utføre handel');
    } finally {
      setLoading(false);
    }
  };

  const totalValue = parseFloat(quantity || '0') * currentPrice;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          onClick={handleOpen}
          className="bg-teal-600 hover:bg-teal-700 text-white font-medium"
        >
          Paper Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teal-500" />
            Paper Trade: {symbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Price Info */}
          <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
            <span className="text-slate-400">Gjeldende pris</span>
            <span className="text-xl font-semibold text-white">
              kr {currentPrice.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Balance Info */}
          {balance !== null && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Tilgjengelig saldo</span>
              <span className="text-slate-300">
                kr {balance.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-slate-300">Mengde</Label>
            <Input
              id="quantity"
              type="number"
              step="0.001"
              min="0"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* Total Value */}
          {totalValue > 0 && (
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400">Total verdi</span>
              <span className="text-lg font-semibold text-white">
                kr {totalValue.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Buy/Sell Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => executeTrade('buy')}
              disabled={loading || !quantity || totalValue <= 0}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              {loading ? 'Kjøper...' : 'Kjøp'}
            </Button>
            <Button
              onClick={() => executeTrade('sell')}
              disabled={loading || !quantity || totalValue <= 0}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDown className="w-4 h-4 mr-2" />
              {loading ? 'Selger...' : 'Selg'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
