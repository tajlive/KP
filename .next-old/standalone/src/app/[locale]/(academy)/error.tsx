'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { captureException } from '@/lib/sentry'

export default function AcademyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const localeMatch = pathname?.match(/^\/(no|en|th|zh)(\/|$)/)
  const locale = localeMatch ? localeMatch[1] : 'no'

  useEffect(() => {
    console.error('[Academy] Error:', error)
    captureException(error, {
      extra: { digest: error.digest, errorName: error.name },
      tags: { errorBoundary: 'academy-error' },
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0A0B0D]">
      <div className="max-w-md w-full rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#7F1D1D]/60 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[#F9FAFB] mb-3">Noe gikk galt</h2>
        <p className="text-[#9CA3AF] mb-2">
          Vi beklager, men en uventet feil har oppstått i akademiet. Teamet er varslet.
        </p>
        {error.digest && (
          <p className="text-xs text-[#6B7280] font-mono mb-6">
            Feilkode: {error.digest}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.refresh()}
            className="w-full min-h-[48px] rounded-xl bg-[#3B82F6] text-white font-medium active:bg-[#2563EB] active:scale-[0.98] transition-all"
          >
            Prøv igjen
          </button>
          <Link
            href={`/${locale}`}
            className="w-full min-h-[48px] rounded-xl border border-[#2A2D35] bg-[#1A1D26]/60 text-[#F9FAFB] font-medium flex items-center justify-center active:border-[#3A3D45] active:scale-[0.98] transition-all"
          >
            Gå til forsiden
          </Link>
        </div>
      </div>
    </div>
  )
}
