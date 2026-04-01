'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTradingMode } from '@/lib/hooks/useTradingMode';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { AlertTriangle, Lock, Unlock, RefreshCw } from 'lucide-react';

export function TradingModeToggle() {
  const { mode, canSwitchToLive, isLoading, switchMode, binanceConnection } = useTradingMode();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<'paper' | 'live' | null>(null);

  const handleModeClick = (newMode: 'paper' | 'live') => {
    if (newMode === mode) return;
    
    if (newMode === 'live') {
      if (!canSwitchToLive) {
        // Redirect to connect Binance modal or show message
        window.dispatchEvent(new CustomEvent('open-binance-connect-modal'));
        return;
      }
      // Show confirmation for switching to live
      setPendingMode('live');
      setShowConfirmModal(true);
    } else {
      // Switching back to paper doesn't need confirmation
      setPendingMode('paper');
      setShowConfirmModal(true);
    }
  };

  const confirmSwitch = async () => {
    if (!pendingMode) return;
    
    const success = await switchMode(pendingMode);
    if (success) {
      setShowConfirmModal(false);
      setPendingMode(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        <button
          onClick={() => handleModeClick('paper')}
          disabled={isLoading}
          className={`relative px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            mode === 'paper'
              ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Lekepenger
          </span>
          {mode === 'paper' && (
            <motion.div
              layoutId="activeMode"
              className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg -z-10"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>

        <button
          onClick={() => handleModeClick('live')}
          disabled={isLoading}
          className={`relative px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            mode === 'live'
              ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            {mode === 'live' ? (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            ) : !canSwitchToLive ? (
              <Lock className="w-3 h-3" />
            ) : (
              <Unlock className="w-3 h-3" />
            )}
            Live Trading
          </span>
          {mode === 'live' && (
            <motion.div
              layoutId="activeMode"
              className="absolute inset-0 bg-white dark:bg-gray-700 rounded-lg -z-10"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingMode === 'live' ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Switch to Live Trading?
                </>
              ) : (
                'Switch to Paper Trading?'
              )}
            </DialogTitle>
            <DialogDescription>
              {pendingMode === 'live' ? (
                <div className="space-y-2">
                  <p className="font-medium text-amber-600">
                    You are about to trade with REAL money on Binance.
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    <li>All trades will use your real Binance balance</li>
                    <li>Profits and losses are real</li>
                    <li>Trading fees apply</li>
                    <li>Make sure you understand the risks</li>
                  </ul>
                </div>
              ) : (
                <p>
                  Switching to paper mode will use virtual money for practice.
                  Your open live positions will remain on Binance.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSwitch}
              disabled={isLoading}
              variant={pendingMode === 'live' ? 'destructive' : 'default'}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : pendingMode === 'live' ? (
                'Yes, I understand the risks'
              ) : (
                'Switch to Paper'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
