'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useTradingMode } from '@/lib/hooks/useTradingMode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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

interface TradingModeToggleProps {
  variant?: 'compact' | 'full';
  showBadge?: boolean;
  className?: string;
}

export function TradingModeToggle({
  variant = 'full',
  showBadge = true,
  className,
}: TradingModeToggleProps) {
  const t = useTranslations('trading');
  const { mode, canSwitchToLive, isLoading, switchMode } = useTradingMode();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<'paper' | 'live' | null>(null);

  const handleToggle = () => {
    const newMode = mode === 'paper' ? 'live' : 'paper';

    if (newMode === 'live') {
      if (!canSwitchToLive) {
        setShowConnectModal(true);
        return;
      }
      // Show confirmation for switching to live
      setPendingMode('live');
      setShowConfirmModal(true);
    } else {
      // Switching back to paper - also show confirmation for clarity
      setPendingMode('paper');
      setShowConfirmModal(true);
    }
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

  const isPaper = mode === 'paper';

  if (variant === 'compact') {
    return (
      <>
        <div className={cn('flex items-center gap-3', className)}>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium transition-colors',
                isPaper ? 'text-green-600' : 'text-gray-500'
              )}
            >
              📝 {t('paperModeShort', { defaultValue: 'Paper' })}
            </span>
            <Switch
              checked={!isPaper}
              onCheckedChange={handleToggle}
              disabled={isLoading}
              className="data-[state=checked]:bg-blue-600"
            />
            <span
              className={cn(
                'text-sm font-medium transition-colors',
                !isPaper ? 'text-blue-600' : 'text-gray-500'
              )}
            >
              💎 {t('liveModeShort', { defaultValue: 'Live' })}
            </span>
          </div>
          {showBadge && (
            <Badge
              variant={isPaper ? 'secondary' : 'destructive'}
              className={cn(
                'text-xs',
                isPaper && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              )}
            >
              {isPaper ? t('paperMode') : t('liveMode')}
            </Badge>
          )}
        </div>

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

  // Full variant
  return (
    <>
      <div
        className={cn(
          'flex items-center gap-4 p-4 rounded-xl shadow-sm border',
          isPaper
            ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
            : 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800',
          className
        )}
      >
        <div className="flex items-center gap-3 flex-1">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center text-xl',
              isPaper
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-blue-100 dark:bg-blue-900/30'
            )}
          >
            {isPaper ? '📝' : '💎'}
          </div>
          <div>
            <p className="font-medium">
              {isPaper ? t('paperMode') : t('liveMode')}
            </p>
            <p className="text-xs text-gray-500">
              {isPaper
                ? t('paperModeDescription', {
                    defaultValue: 'Øv med virtuell kapital',
                  })
                : t('liveModeDescription', {
                    defaultValue: 'Handel med ekte penger',
                  })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPaper && !canSwitchToLive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConnectModal(true)}
              className="gap-1"
            >
              <Lock className="w-3 h-3" />
              {t('connectBinance')}
              <ArrowRightLeft className="w-3 h-3 ml-1" />
            </Button>
          )}

          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium',
                isPaper ? 'text-green-600' : 'text-gray-400'
              )}
            >
              {t('paperModeShort', { defaultValue: 'Paper' })}
            </span>
            <Switch
              checked={!isPaper}
              onCheckedChange={handleToggle}
              disabled={isLoading}
              className="data-[state=checked]:bg-blue-600"
            />
            <span
              className={cn(
                'text-sm font-medium',
                !isPaper ? 'text-blue-600' : 'text-gray-400'
              )}
            >
              {t('liveModeShort', { defaultValue: 'Live' })}
            </span>
          </div>
        </div>
      </div>

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
                <AlertTriangle className="w-5 h-5 text-red-500" />
                {t('switchToLiveTitle')}
              </>
            ) : (
              <>
                <Info className="w-5 h-5 text-blue-500" />
                {t('switchToPaperTitle', { defaultValue: 'Bytt til Paper Trading?' })}
              </>
            )}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {isLive ? (
              <div className="space-y-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="font-semibold text-red-700 dark:text-red-400">
                    {t('switchToLiveWarning')}
                  </p>
                </div>
                <div className="space-y-3">
                  <WarningItem
                    icon={<DollarSign className="w-4 h-4" />}
                    text={t('liveWarningRealMoney', {
                      defaultValue: 'Du handler nå med EKTE penger',
                    })}
                  />
                  <WarningItem
                    icon={<AlertCircle className="w-4 h-4" />}
                    text={t('liveWarningLosses', {
                      defaultValue: 'Tap er reelle, ikke simulerte',
                    })}
                  />
                  <WarningItem
                    icon={<FileText className="w-4 h-4" />}
                    text={t('liveWarningFees', {
                      defaultValue: 'Handelsgebyrer trekkes fra din Binance-konto',
                    })}
                  />
                  <WarningItem
                    icon={<ArrowRightLeft className="w-4 h-4" />}
                    text={t('liveWarningSwitchBack', {
                      defaultValue: 'Du kan bytte tilbake til paper mode når som helst',
                    })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p>{t('switchToPaperWarning', { defaultValue: 'Du bytter tilbake til paper trading.' })}</p>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    {t('switchToPaperNote', {
                      defaultValue: 'Åpne live posisjoner forblir aktive på Binance. Du kan bytte tilbake til live mode når som helst.',
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
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : isLive ? (
              <>
                <Unlock className="w-4 h-4 mr-2" />
                {t('confirmSwitchToLive', { defaultValue: 'Ja, bytt til Live Trading' })}
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
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
      <span className="text-gray-500 mt-0.5">{icon}</span>
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
            <Lock className="w-5 h-5 text-amber-500" />
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
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-sm">{t('apiKeySecurity', { defaultValue: 'Sikker lagring' })}</p>
              <p className="text-xs text-gray-500">
                {t('apiKeySecurityDesc', {
                  defaultValue: 'API-nøkler krypteres og lagres sikkert. Vi har aldri tilgang til å ta ut penger.',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FileText className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium text-sm">{t('apiKeyPermissions', { defaultValue: 'Krevde tillatelser' })}</p>
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
            <Unlock className="w-4 h-4 mr-2" />
            {t('connectNow', { defaultValue: 'Koble til nå' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
