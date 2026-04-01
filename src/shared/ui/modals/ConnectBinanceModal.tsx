'use client';

import { useState } from 'react';
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

interface ConnectBinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectBinanceModal({ isOpen, onClose }: ConnectBinanceModalProps) {
  const { connectBinance, isLoading, error } = useTradingMode();
  const [step, setStep] = useState<'intro' | 'form' | 'verifying' | 'success'>('intro');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [understandRisks, setUnderstandRisks] = useState(false);
  const [noWithdrawPermission, setNoWithdrawPermission] = useState(false);

  const handleSubmit = async () => {
    if (!apiKey || !apiSecret) return;
    
    setStep('verifying');
    const success = await connectBinance(apiKey, apiSecret);
    
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
            Connect Binance Account
          </DialogTitle>
          <DialogDescription>
            Link your Binance account to enable live trading with real crypto.
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
                  <strong>Your security is our priority:</strong>
                  <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                    <li>API keys are encrypted with AES-256</li>
                    <li>We never store keys in plain text</li>
                    <li>Keys are never sent to frontend after storage</li>
                    <li>You can disconnect at any time</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Warning */}
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Important:</strong> When creating your API key on Binance, 
                  <span className="font-bold text-red-600"> NEVER enable "Withdraw" permission</span>. 
                  Only "Enable Reading" and "Enable Spot & Margin Trading" should be enabled.
                </AlertDescription>
              </Alert>

              {/* Steps */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">How to create your API key:</h4>
                <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                  <li>Log in to your Binance account</li>
                  <li>Go to API Management</li>
                  <li>Create a new API key</li>
                  <li>
                    <span className="text-red-600 font-medium">Important:</span> Only enable:
                    <ul className="ml-6 mt-1 space-y-1 list-disc">
                      <li>✅ Enable Reading</li>
                      <li>✅ Enable Spot & Margin Trading</li>
                      <li>❌ Enable Withdrawals (MUST be disabled)</li>
                    </ul>
                  </li>
                  <li>Copy and paste your API Key and Secret below</li>
                </ol>
              </div>

              <Button
                onClick={() => setStep('form')}
                className="w-full"
              >
                I understand, continue
              </Button>

              <Button
                variant="outline"
                onClick={() => window.open('https://www.binance.com/en/my/settings/api-management', '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Go to Binance API Management
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
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Binance API Key"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-secret">API Secret</Label>
                <div className="relative">
                  <Input
                    id="api-secret"
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Paste your Binance API Secret"
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
                  Your API Secret is encrypted before storage and never shown again.
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
                    I confirm my API key does NOT have "Withdraw" permission enabled
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="understand-risks"
                    checked={understandRisks}
                    onCheckedChange={(checked) => setUnderstandRisks(checked as boolean)}
                  />
                  <Label htmlFor="understand-risks" className="text-sm font-normal cursor-pointer">
                    I understand that live trading involves real money and risks
                  </Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('intro')}
                  className="flex-1"
                >
                  Back
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
                  Connect Securely
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
              <p className="text-lg font-medium">Verifying your API key...</p>
              <p className="text-sm text-gray-500">
                This may take a few seconds. We&apos;re checking your API permissions with Binance.
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
              <h3 className="text-xl font-bold text-green-600">Connected Successfully!</h3>
              <p className="text-gray-600">
                Your Binance account is now connected. You can now switch to Live Trading mode.
              </p>
              <Button onClick={handleClose} className="w-full">
                Start Trading
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
