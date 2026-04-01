'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Mail, AlertCircle, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/utils'
import { getCallbackUrl } from '@/lib/auth/config'
import { DotPattern } from '@/shared/ui/dot-pattern'
import { cn } from '@/lib/utils'

export default function GlemtPassordClient() {
    const locale = useLocale()
    const t = useTranslations('auth')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const supabase = createClient()
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${getCallbackUrl(locale).replace('/auth/callback', '')}/reset-password`,
            })

            if (resetError) {
                setError(resetError.message)
                return
            }

            setSubmitted(true)
        } catch (_err) {
            setError(t('forgotPasswordPage.error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen relative bg-slate-950 flex items-center justify-center p-4">
            <DotPattern
                className={cn(
                    "mask-[radial-gradient(400px_circle_at_center,white,transparent)]",
                    "absolute inset-0 h-full w-full fill-white/10"
                )}
            />

            <div className="relative z-10 w-full max-w-md">
                <Link
                    href={`/${locale}/innlogging`}
                    className="inline-flex items-center text-slate-400 hover:text-white text-sm mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('backToHome')}
                </Link>

                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
                    <CardHeader className="text-center pb-2">
                        {!submitted && (
                            <div className="mx-auto w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4">
                                <Mail className="w-6 h-6 text-blue-500" />
                            </div>
                        )}
                        {submitted && (
                            <div className="mx-auto w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center mb-4">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                        )}
                        <CardTitle className="text-white text-2xl font-bold">
                            {submitted ? t('forgotPasswordPage.success') : t('forgotPasswordPage.title')}
                        </CardTitle>
                        <CardDescription className="text-slate-400 mt-2">
                            {submitted
                                ? t('forgotPasswordPage.success') // Re-using or adapting success message
                                : t('forgotPasswordPage.desc')}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6">
                        {!submitted ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="glemt-passord-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                                        {t('forgotPasswordPage.emailLabel')}
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <Input
                                            id="glemt-passord-email"
                                            type="email"
                                            placeholder={t('forgotPasswordPage.emailPlaceholder')}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-500"
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 py-3">
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                        <AlertDescription className="text-red-400 text-sm ml-2">
                                            {error}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-500/20"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            {t('forgotPasswordPage.sending')}
                                        </>
                                    ) : (
                                        t('forgotPasswordPage.submit')
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center space-y-6">
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    {t('forgotPasswordPage.success')}
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                                    asChild
                                >
                                    <Link href={`/${locale}/innlogging`}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        {t('backToHome')}
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
