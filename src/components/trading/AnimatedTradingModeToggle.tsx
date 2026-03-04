'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useTradingMode } from '@/lib/hooks/useTradingMode';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  Info,
  FileText,
  TrendingUp,
  AlertCircle,
  DollarSign,
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedTradingModeToggleProps {
  className?: string;
}

export function AnimatedTradingModeToggle({
  className,
}: AnimatedTradingModeToggleProps) {
  const t = useTranslations('trading');
  const { mode, canSwitchToLive, isLoading, switchMode } = useTradingMode();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<'paper' | 'live' | null>(null);

  const isPaper = mode === 'paper';

  const handleToggle = () => {
    const newMode = isPaper ? 'live' : 'paper';

    if (newMode === 'live' && !canSwitchToLive) {
      setShowConnectModal(true);
      return;
    }

    setPendingMode(newMode);
    setShowConfirmModal(true);
  };

  const confirmSwitch = async () => {
    if (!pendingMode) return;

    const success = await switchMode(pendingMode);
    if (success) {
      setShowConfirmModal(false);
      setShowConnectModal(false);
      setPendingMode(null);
    }
  };

  return (
    <>
      {/* Pill-shaped animated toggle */}
      <motion.button
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          'relative h-10 w-[200px] rounded-full p-1 transition-colors duration-300',
          isPaper
            ? 'bg-gradient-to-r from-sky-500 to-cyan-500'
            : 'bg-gradient-to-r from-emerald-500 to-amber-500',
          className
        )}
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.02 }}
      >
        {/* Background labels */}
        <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-semibold text-white/90">
          <span className={cn('transition-opacity', isPaper ? 'opacity-100' : 'opacity-40')}>
            📄 Paper
          </span>
          <span className={cn('transition-opacity', !isPaper ? 'opacity-100' : 'opacity-40')}>
            💰 Live
          </span>
        </div>

        {/* Animated toggle knob */}
        <motion.div
          className="relative h-8 w-20 rounded-full bg-white shadow-lg"
          layout
          transition={{
            type: 'spring' as const,
            stiffness: 500,
            damping: 30,
          }}
          animate={{
            x: isPaper ? 0 : 112,
          }}
        >
          {/* Icon inside knob */}
          <div className="flex h-full items-center justify-center">
            <AnimatePresence mode="wait">
              {isPaper ? (
                <motion.span
                  key="paper-icon"
                  initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                  className="text-lg"
                >
                  📄
                </motion.span>
              ) : (
                <motion.span
                  key="live-icon"
                  initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: -90 }}
                  transition={{ duration: 0.2 }}
                  className="text-lg"
                >
                  💰
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.button>

      {/* Confirmation Modal */}
      <ConfirmationModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        pendingMode={pendingMode}
        isLoading={isLoading}
        onConfirm={confirmSwitch}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Connect Binance Modal */}
      <ConnectBinanceModal
        open={showConnectModal}
        onOpenChange={setShowConnectModal}
      />
    </>
  );
}

// Confirmation Modal Component
interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingMode: 'paper' | 'live' | null;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmationModal({
  open,
  onOpenChange,
  pendingMode,
  isLoading,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const t = useTranslations('trading');
  const isLive = pendingMode === 'live';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLive ? (
              <>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {t('switchToLiveTitle')}
              </>
            ) : (
              <>
                <Info className="h-5 w-5 text-blue-500" />
                {t('switchToPaperTitle', { defaultValue: 'Bytt til Paper Trading?' })}
              </>
            )}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {isLive ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <p className="font-semibold text-red-700 dark:text-red-400">
                    {t('switchToLiveWarning')}
                  </p>
                </div>
                <div className="space-y-3">
                  <WarningItem
                    icon={<DollarSign className="h-4 w-4" />}
                    text={t('liveWarningRealMoney', {
                      defaultValue: 'Du handler nå med EKTE penger',
                    })}
                  />
                  <WarningItem
                    icon={<AlertCircle className="h-4 w-4" />}
                    text={t('liveWarningLosses', {
                      defaultValue: 'Tap er reelle, ikke simulerte',
                    })}
                  />
                  <WarningItem
                    icon={<FileText className="h-4 w-4" />}
                    text={t('liveWarningFees', {
                      defaultValue: 'Handelsgebyrer trekkes fra din Binance-konto',
                    })}
                  />
                  <WarningItem
                    icon={<ArrowRightLeft className="h-4 w-4" />}
                    text={t('liveWarningSwitchBack', {
                      defaultValue: 'Du kan bytte tilbake til paper mode når som helst',
                    })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p>{t('switchToPaperWarning', { defaultValue: 'Du bytter tilbake til paper trading.' })}</p>
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    {t('switchToPaperNote', {
                      defaultValue:
                        'Åpne live posisjoner forblir aktive på Binance. Du kan bytte tilbake til live mode når som helst.',
                    })}
                  </p>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {t('cancel', { defaultValue: 'Avbryt' })}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            variant={isLive ? 'destructive' : 'default'}
            className={cn(!isLive && 'bg-blue-600 hover:bg-blue-700')}
          >
            {isLoading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : isLive ? (
              <>
                <Unlock className="mr-2 h-4 w-4" />
                {t('confirmSwitchToLive', { defaultValue: 'Ja, bytt til Live Trading' })}
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                {t('confirmSwitchToPaper', { defaultValue: 'Bytt til Paper' })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Warning Item Component
function WarningItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
      <span className="mt-0.5 text-gray-500">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

// Connect Binance Modal Component
interface ConnectBinanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ConnectBinanceModal({ open, onOpenChange }: ConnectBinanceModalProps) {
  const t = useTranslations('trading');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            {t('connectBinanceRequired', { defaultValue: 'Koble til Binance' })}
          </DialogTitle>
          <DialogDescription>
            {t('connectBinanceDescription', {
              defaultValue:
                'For å bytte til live trading må du først koble til din Binance-konto med API-nøkler.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <TrendingUp className="mt-0.5 h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium">{t('apiKeySecurity', { defaultValue: 'Sikker lagring' })}</p>
              <p className="text-xs text-gray-500">
                {t('apiKeySecurityDesc', {
                  defaultValue:
                    'API-nøkler krypteres og lagres sikkert. Vi har aldri tilgang til å ta ut penger.',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <FileText className="mt-0.5 h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium">{t('apiKeyPermissions', { defaultValue: 'Krevde tillatelser' })}</p>
              <p className="text-xs text-gray-500">
                {t('apiKeyPermissionsDesc', {
                  defaultValue: 'Kun spot trading og lesing. IKKE aktiver uttak (withdraw).',
                })}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('later', { defaultValue: 'Senere' })}
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              window.dispatchEvent(new CustomEvent('open-binance-connect-modal'));
            }}
          >
            <Unlock className="mr-2 h-4 w-4" />
            {t('connectNow', { defaultValue: 'Koble til nå' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
