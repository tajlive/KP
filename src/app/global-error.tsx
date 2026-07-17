'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { AlertTriangle } from 'lucide-react'
import { captureException } from '@/lib/sentry'

// Global error must be named global-error.js/tsx and wrap html/body
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const retryCountRef = useRef(0)
    const [retryCount, setRetryCount] = useState(0)

    useEffect(() => {
        // Log error with digest for debugging
        console.error('Global Error - Digest:', (error as Error & { digest?: string }).digest)
        console.error('Root Layout Error:', error)
        
        // Send to GlitchTip with extra context
        captureException(error, {
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

    function handleRetry() {
        retryCountRef.current += 1
        setRetryCount(retryCountRef.current)

        if (retryCountRef.current === 1) {
            // Første klikk: prøv reset() + router.refresh() (via full page reload i global context)
            reset()
        } else {
            // Andre+ klikk (feilen vedvarer): full page reload
            window.location.reload()
        }
    }

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
                                Referanse: {error.digest} (oppgi denne ved henvendelse)
                            </p>
                        )}
                        <Button
                            onClick={handleRetry}
                            size="lg"
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-8"
                        >
                            {retryCount >= 1 ? 'Last inn på nytt' : 'Prøv igjen'}
                        </Button>
                    </div>
                </div>
            </body>
        </html>
    )
}
