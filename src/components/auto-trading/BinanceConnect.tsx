'use client'

import { useState } from 'react'
import { createClient } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Copy,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Info
} from 'lucide-react'

// Binance Referral Configuration
const BINANCE_REFERRAL = {
  code: '43427892',
  link: 'https://accounts.binance.com/register?ref=43427892',
  benefits: {
    user: '20% rabatt på trading fees',
    referrer: 'Støtter videre utvikling av Klarpakke'
  }
}

interface BinanceConnectProps {
  userId: string
  onConnected?: () => void
}

export function BinanceConnect({ userId, onConnected }: BinanceConnectProps) {
  const [step, setStep] = useState<'intro' | 'signup' | 'api' | 'verify'>('intro')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const copyReferralLink = () => {
    navigator.clipboard.writeText(BINANCE_REFERRAL.link)
    toast.success('Referral link kopiert!')
  }

  const handleSaveApiKeys = async () => {
    if (!apiKey?.trim() || !apiSecret?.trim()) {
      toast.error('Begge feltene må fylles ut')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Encrypt and save API keys via edge function
      const { error } = await supabase.functions.invoke('connect-exchange', {
        body: {
          exchange: 'binance',
          api_key: apiKey?.trim(),
          api_secret: apiSecret?.trim(),
          is_testnet: false
        }
      })

      if (error) throw error

      toast.success('API nøkler lagret!')
      setIsConnected(true)
      onConnected?.()
    } catch (error) {
      toast.error('Kunne ikke lagre API nøkler')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const openBinanceSignup = () => {
    window.open(BINANCE_REFERRAL.link, '_blank')
    setStep('api')
  }

  if (isConnected) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Binance Koblet Til!</h3>
          <p className="text-slate-400 mb-4">
            Din konto er nå klar for auto-trading.
          </p>
          <Badge className="bg-green-500/20 text-green-400">
            Referral: {BINANCE_REFERRAL.code} ✅
          </Badge>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          Koble til Binance
        </CardTitle>
        <CardDescription className="text-slate-400">
          Auto-trading krever Binance API-tilgang
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'intro' && (
          <div className="space-y-6">
            {/* Referral Box */}
            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <ExternalLink className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">Har du ikke Binance?</h4>
                  <p className="text-sm text-slate-400 mb-3">
                    Registrer deg med vår referral link og få{' '}
                    <span className="text-amber-400 font-medium">20% rabatt</span> på trading fees!
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-slate-800 px-3 py-2 rounded text-sm text-slate-300">
                      {BINANCE_REFERRAL.link}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyReferralLink}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-amber-400 font-semibold">20%</p>
                <p className="text-slate-400 text-sm">Trading fee rabatt</p>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-green-400 font-semibold">0 kr</p>
                <p className="text-slate-400 text-sm">Ingen ekstra kostnad</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={openBinanceSignup} className="flex-1 bg-amber-600 hover:bg-amber-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                Registrer på Binance
              </Button>
              <Button onClick={() => setStep('api')} variant="outline" className="border-slate-700">
                Har allerede konto
              </Button>
            </div>
          </div>
        )}

        {step === 'api' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-400 mb-2">Hvordan finne API nøkler:</h4>
              <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                <li>Logg inn på Binance</li>
                <li>Gå til <strong>API Management</strong></li>
                <li>Opprett ny API nøkkel</li>
                <li>Aktiver <strong>Enable Reading</strong> og <strong>Enable Spot & Margin Trading</strong></li>
                <li>Lim inn nøklene under</li>
              </ol>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-400 mb-1">Viktig: IP Whitelist</h4>
                  <p className="text-sm text-slate-400 mb-2">
                    Binance krever IP-whitelist for API-nøkler med trading-tillatelser. 
                    Kontakt oss på <a href="mailto:post@klarpakke.no" className="text-blue-400 hover:underline">post@klarpakke.no</a> for å få IP-adresser som skal whitelistes.
                  </p>
                  <p className="text-xs text-slate-500">
                    Alternativt kan du bruke read-only tilgang (portefølje-tracking) uten IP-restriksjoner.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">API Key</label>
                <Input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">API Secret</label>
                <div className="relative">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="bg-slate-800 border-slate-700 pr-10"
                  />
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Lock className="w-4 h-4" />
              <span>Nøklene krypteres med AES-256 før lagring</span>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleSaveApiKeys} 
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Lagrer...' : 'Koble til Binance'}
              </Button>
              <Button onClick={() => setStep('intro')} variant="outline" className="border-slate-700">
                Tilbake
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Referral Stats Component for Admin
 */
export function ReferralStats() {
  const [stats, setStats] = useState({
    totalReferrals: 0,
    activeTraders: 0,
    estimatedCommission: 0
  })

  // In production, fetch from database
  // This is a placeholder component for the admin dashboard

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Binance Referral</CardTitle>
        <CardDescription className="text-slate-400">
          Kode: <span className="text-amber-400 font-mono">{BINANCE_REFERRAL.code}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-800/50 rounded-lg">
            <p className="text-2xl font-bold text-white">{stats.totalReferrals}</p>
            <p className="text-sm text-slate-400">Registreringer</p>
          </div>
          <div className="text-center p-4 bg-slate-800/50 rounded-lg">
            <p className="text-2xl font-bold text-green-400">{stats.activeTraders}</p>
            <p className="text-sm text-slate-400">Aktive Tradere</p>
          </div>
          <div className="text-center p-4 bg-slate-800/50 rounded-lg">
            <p className="text-2xl font-bold text-amber-400">${stats.estimatedCommission}</p>
            <p className="text-sm text-slate-400">Est. Kommisjon</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Referral Link:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 truncate">
              {BINANCE_REFERRAL.link}
            </code>
            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(BINANCE_REFERRAL.link)}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
