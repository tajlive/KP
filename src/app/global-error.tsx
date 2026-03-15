'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

// Global error must be named global-error.js/tsx and wrap html/body
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log error with digest for debugging
        console.error('Global Error - Digest:', (error as Error & { digest?: string }).digest)
        console.error('Root Layout Error:', error)
        
        // Send to Sentry with extra context
        Sentry.captureException(error, {
            extra: {
                digest: (error as Error & { digest?: string }).digest,
                errorName: error.name,
                errorMessage: error.message,
            },
            tags: {
                errorBoundary: 'global-error',
            },
        })
    }, [error])

    return (
        <html lang="no">
            <body>
                <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white text-center">
                    <div className="max-w-md w-full">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-amber-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-4">Oisann!</h1>
                        <p className="text-slate-600 mb-2 text-lg">
                            En kritisk feil oppstod. Dette er vårt sikkerhetsnett som fanget opp fallet.
                        </p>
                        {error.digest && (
                            <p className="text-xs text-slate-400 font-mono mb-6">
                                Feilkode: {error.digest}
                            </p>
                        )}
                        <Button
                            onClick={() => reset()}
                            size="lg"
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-8"
                        >
                            Last inn på nytt
                        </Button>
                    </div>
                </div>
            </body>
        </html>
    )
}
