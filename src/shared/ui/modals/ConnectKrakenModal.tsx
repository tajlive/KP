'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Checkbox } from '@/shared/ui/checkbox';
import { 
  ExternalLink, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectKrakenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectKrakenModal({ isOpen, onClose }: ConnectKrakenModalProps) {
  const t = useTranslations("trading.connectKrakenModal");
  const { connectKraken, isLoading, error } = useTradingMode();
  const [step, setStep] = useState<'intro' | 'form' | 'verifying' | 'success'>('intro');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [understandRisks, setUnderstandRisks] = useState(false);
  const [noWithdrawPermission, setNoWithdrawPermission] = useState(false);

  const handleSubmit = async () => {
    if (!apiKey || !apiSecret) return;
    
    setStep('verifying');
    const success = await connectKraken(apiKey, apiSecret);
    
    if (success) {
      setStep('success');
      // Clear sensitive data
      setApiKey('');
      setApiSecret('');
    } else {
      setStep('form');
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      setStep('intro');
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Security Info */}
              <Alert className="bg-blue-50 border-blue-200">
                <Shield className="w-4 h-4 text-blue-500" />
                <AlertDescription className="text-blue-700">
                  <strong>{t("securityTitle")}</strong>
                  <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                    <li>{t("security1")}</li>
                    <li>{t("security2")}</li>
                    <li>{t("security3")}</li>
                    <li>{t("security4")}</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Warning */}
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>{t("warningTitle")}</strong>{" "}
                  {t("warningText")}
                </AlertDescription>
              </Alert>

              {/* Steps */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">{t("stepsTitle")}</h4>
                <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                  <li>{t("step1")}</li>
                  <li>{t("step2")}</li>
                  <li>{t("step3")}</li>
                  <li>
                    <span className="text-red-600 font-medium">{t("step4Important")}</span>{" "}
                    {t("step4OnlyEnable")}
                    <ul className="ml-6 mt-1 space-y-1 list-disc">
                      <li>{t("step4Reading")}</li>
                      <li>{t("step4Trading")}</li>
                      <li>{t("step4Withdrawals")}</li>
                    </ul>
                  </li>
                  <li>{t("step5")}</li>
                </ol>
              </div>

              <Button
                onClick={() => setStep('form')}
                className="w-full"
              >
                {t("continue")}
              </Button>

              <Button
                variant="outline"
                onClick={() => window.open('https://www.kraken.com/u/settings/api', '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t("common.goToKraken")}
              </Button>
            </motion.div>
          )}

          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="api-key">{t("apiKeyLabel")}</Label>
                <Input
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t("apiKeyPlaceholder")}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-secret">{t("apiSecretLabel")}</Label>
                <div className="relative">
                  <Input
                    id="api-secret"
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder={t("apiSecretPlaceholder")}
                    className="font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {t("secretHint")}
                </p>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="no-withdraw"
                    checked={noWithdrawPermission}
                    onCheckedChange={(checked) => setNoWithdrawPermission(checked as boolean)}
                  />
                  <Label htmlFor="no-withdraw" className="text-sm font-normal cursor-pointer">
                    {t("noWithdrawConfirm")}
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="understand-risks"
                    checked={understandRisks}
                    onCheckedChange={(checked) => setUnderstandRisks(checked as boolean)}
                  />
                  <Label htmlFor="understand-risks" className="text-sm font-normal cursor-pointer">
                    {t("understandRisks")}
                  </Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('intro')}
                  className="flex-1"
                >
                  {t("back")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!apiKey || !apiSecret || !understandRisks || !noWithdrawPermission || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  {t("connectSecurely")}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'verifying' && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center space-y-4"
            >
              <RefreshCw className="w-12 h-12 animate-spin mx-auto text-blue-500" />
              <p className="text-lg font-medium">{t("verifyingTitle")}</p>
              <p className="text-sm text-gray-500">
                {t("verifyingDesc")}
              </p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center space-y-4"
            >
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
              <h3 className="text-xl font-bold text-green-600">{t("successTitle")}</h3>
              <p className="text-gray-600">
                {t("successDesc")}
              </p>
              <Button onClick={handleClose} className="w-full">
                {t("startTrading")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
