'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { createClient } from '@/lib/utils'

interface Trade {
  symbol: string
  side: 'buy' | 'sell'
  amount: number
}

interface TradeAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  reasoning: string
  recommendation: 'approve' | 'caution' | 'block'
  educationalTips: string[]
}

interface PreTradeWarningProps {
  trade: Trade
  onConfirm: () => void
  onCancel: () => void
  locale: 'no' | 'en'
}

export function PreTradeWarning({ 
  trade, 
  onConfirm, 
  onCancel, 
  locale 
}: PreTradeWarningProps) {
  const t = useTranslations('trading')
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [understood, setUnderstood] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function analyze() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        const { data: { session } } = await supabase.auth.getSession()

        const response = await fetch('/api/ai/analyze-trade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({
            trade,
            locale,
            userLevel: 'beginner'
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Analysis failed')
        }

        const result = await response.json()
        setAnalysis(result as TradeAnalysis)
      } catch (error: unknown) {
        console.error('Analysis error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        toast.error(t('analysisError') + ': ' + errorMessage)
        onCancel()
      } finally {
        setLoading(false)
      }
    }
    analyze()
  }, [trade, locale])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-center">{t('analyzingTrade')}</p>
        </div>
      </div>
    )
  }

  if (!analysis) return null

  const riskColors = {
    low: 'bg-green-50 border-green-500',
    medium: 'bg-yellow-50 border-yellow-500',
    high: 'bg-orange-50 border-orange-500',
    extreme: 'bg-red-50 border-red-500'
  }

  const riskIcons = {
    low: '✅',
    medium: '⚠️',
    high: '🚨',
    extreme: '🛑'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className={`max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border-4 my-8 ${riskColors[analysis.riskLevel]}`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">{riskIcons[analysis.riskLevel]}</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('riskAnalysis')}
            </h2>
            <p className="text-gray-600">
              {t('riskLevel')}: <span className="font-semibold capitalize">
                {t(`risk.${analysis.riskLevel}`)}
              </span>
            </p>
          </div>
        </div>

        {/* Trade Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t('type')}:</span>
              <span className="ml-2 font-semibold">
                {trade.side === 'buy' ? `🟢 ${t('buy')}` : `🔴 ${t('sell')}`}
              </span>
            </div>
            <div>
              <span className="text-gray-500">{t('coin')}:</span>
              <span className="ml-2 font-semibold">{trade.symbol}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">{t('amount')}:</span>
              <span className="ml-2 font-semibold">{trade.amount} NOK</span>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">
            🤖 {t('aiAssessment')}:
          </h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {analysis.reasoning}
          </p>
        </div>

        {/* Educational Tips */}
        {analysis.educationalTips?.length > 0 && (
          <div className="mb-6 bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              💡 {t('learningPoints')}:
            </h3>
            <ul className="space-y-2">
              {analysis.educationalTips.map((tip: string, i: number) => (
                <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confirmation Checkbox */}
        {analysis.recommendation === 'caution' && (
          <label className="flex items-start gap-3 mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 cursor-pointer">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-yellow-900">{t('understandRisk')}</span>
          </label>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-colors"
          >
            {t('cancel')}
          </button>

          <button
            onClick={onConfirm}
            disabled={
              analysis.recommendation === 'block' ||
              (analysis.recommendation === 'caution' && !understood)
            }
            className={`flex-1 px-6 py-3 font-semibold rounded-full transition-colors ${
              analysis.recommendation === 'approve'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : analysis.recommendation === 'caution'
                ? 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {analysis.recommendation === 'block' 
              ? `🛑 ${t('tradeBlocked')}`
              : analysis.recommendation === 'caution'
              ? `⚠️ ${t('proceedAnyway')}`
              : `✅ ${t('executeTrade')}`
            }
          </button>
        </div>
      </div>
    </div>
  )
}
