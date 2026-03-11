'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileWarning } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log error with digest for debugging
        console.error('Locale Error - Digest:', (error as Error & { digest?: string }).digest)
        console.error('Locale error:', error)
        
        // Send to Sentry with extra context
        Sentry.captureException(error, {
            extra: {
                digest: (error as Error & { digest?: string }).digest,
                errorName: error.name,
                errorMessage: error.message,
            },
            tags: {
                errorBoundary: 'locale-error',
            },
        })
    }, [error])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileWarning className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Noe gikk galt</h2>
                <p className="text-slate-600 mb-2">
                    Vi beklager, men en uventet feil har oppstått. Vi har fått beskjed og ser på saken.
                </p>
                {error.digest && (
                    <p className="text-xs text-slate-400 font-mono mb-6">
                        Feilkode: {error.digest}
                    </p>
                )}
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => reset()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                    >
                        Prøv igjen
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.location.href = '/'}
                        className="w-full rounded-full"
                    >
                        Gå til forsiden
                    </Button>
                </div>
            </div>
        </div>
    )
}
