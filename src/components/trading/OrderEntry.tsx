'use client';

import { useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrderEntry() {
  const { selectedSymbol, marketData, openPosition, portfolio } = useTradingStore();
  
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [quantity, setQuantity] = useState('');
  const [leverage, setLeverage] = useState('1');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPrice = marketData[selectedSymbol]?.price || 0;
  const maxPosition = portfolio.balance * parseInt(leverage);

  const calculateMargin = () => {
    const qty = parseFloat(quantity) || 0;
    return (qty * currentPrice) / parseInt(leverage);
  };

  const calculateFee = () => {
    const qty = parseFloat(quantity) || 0;
    return qty * currentPrice * 0.001;
  };

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) return;
    
    setIsSubmitting(true);
    
    try {
      openPosition({
        symbol: selectedSymbol,
        side,
        entryPrice: currentPrice,
        quantity: parseFloat(quantity),
        leverage: parseInt(leverage),
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      });
      
      // Reset form
      setQuantity('');
      setStopLoss('');
      setTakeProfit('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = 
    quantity && 
    parseFloat(quantity) > 0 && 
    calculateMargin() <= portfolio.balance;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Ny Handel
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {selectedSymbol} @ ${currentPrice.toLocaleString()}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Side Selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide('long')}
            className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${
              side === 'long'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            KJØP (LONG)
          </button>
          <button
            onClick={() => setSide('short')}
            className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${
              side === 'short'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <TrendingDown className="w-4 h-4 inline mr-2" />
            SELG (SHORT)
          </button>
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="order-entry-quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Antall (stk)
          </label>
          <Input
            id="order-entry-quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            className="text-lg font-mono"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              Verdi: ${((parseFloat(quantity) || 0) * currentPrice).toLocaleString()}
            </span>
            <button 
              onClick={() => setQuantity((portfolio.balance / currentPrice).toFixed(4))}
              className="text-xs text-blue-600 hover:underline"
            >
              Maks
            </button>
          </div>
        </div>

        {/* Leverage */}
        <div>
          <label htmlFor="order-entry-leverage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Leverage: {leverage}x
          </label>
          <input
            id="order-entry-leverage"
            type="range"
            min="1"
            max="125"
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1x</span>
            <span>50x</span>
            <span>125x</span>
          </div>
        </div>

        {/* Stop Loss / Take Profit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="order-entry-stop-loss" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stop Loss
            </label>
            <Input
              id="order-entry-stop-loss"
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="$0.00"
              className="font-mono"
            />
          </div>
          <div>
            <label htmlFor="order-entry-take-profit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Take Profit
            </label>
            <Input
              id="order-entry-take-profit"
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="$0.00"
              className="font-mono"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Margin påkrevd</span>
            <span className="font-mono font-medium">${calculateMargin().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Handelsgebyr (0.1%)</span>
            <span className="font-mono font-medium">${calculateFee().toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="font-medium text-gray-900 dark:text-white">Total</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                ${(calculateMargin() + calculateFee()).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <AnimatePresence>
          {isValid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full py-4 text-lg font-bold rounded-xl transition-all ${
                  side === 'long'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isSubmitting ? 'Åpner posisjon...' : `${side === 'long' ? 'KJØP' : 'SELG'} ${selectedSymbol}`}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!isValid && quantity && (
          <p className="text-sm text-red-600 text-center">
            {calculateMargin() > portfolio.balance 
              ? 'Ikke nok margin tilgjengelig' 
              : 'Vennligst fyll inn antall'}
          </p>
        )}
      </div>
    </div>
  );
}
