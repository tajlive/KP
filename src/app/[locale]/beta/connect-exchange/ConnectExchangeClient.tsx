'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/utils'
import { getErrorMessage } from '@/lib/utils/error'
import { toast } from 'sonner'

export default function ConnectExchangeClient({ 
  params 
}: { 
  params: { locale: string } 
}) {
  const t = useTranslations('trading')
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    apiKey: '',
    apiSecret: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: { session } } = await supabase.auth.getSession()

      // Call Supabase Edge Function (works in static export)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/binance-connector`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            action: 'test_connection',
            apiKey: formData.apiKey,
            apiSecret: formData.apiSecret,
            testnet: true
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Connection failed')
      }

      toast.success(t('exchangeConnected'))
      router.push(`/${params.locale}/beta/dashboard`)

    } catch (error: unknown) {
      console.error('Connect error:', error)
      toast.error(getErrorMessage(error) || t('connectionError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('connectExchange')}
            </h1>
            <p className="text-gray-600">{t('connectExchangeDesc')}</p>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>🔒 {t('security')}:</strong> {t('securityNote')}
            </p>
          </div>

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-900">
              <strong>⚠️ {t('important')}:</strong> {t('permissionsWarning')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('apiKeyLabel')}
              </label>
              <input
                type="text"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-600"
                placeholder="Enter Binance API Key"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('apiSecretLabel')}
              </label>
              <input
                type="password"
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-600"
                placeholder="Enter Binance API Secret"
              />
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">{t('howToGetApiKeys')}:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Gå til Binance.com → Account → API Management</li>
                <li>Opprett ny API key</li>
                <li>Aktiver KUN &quot;Read&quot; og &quot;Spot & Margin Trading&quot; (IKKE Withdraw!)</li>
                <li>Kopier API Key og Secret hit</li>
              </ol>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t('connecting') : t('connectNow')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
