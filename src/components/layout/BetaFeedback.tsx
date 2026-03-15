'use client'

import { useState } from 'react'
import { MessageSquarePlus, X, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/utils'
import { toast } from 'sonner'

export function BetaFeedback() {
    const [isOpen, setIsOpen] = useState(false)
    const [feedback, setFeedback] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isSent, setIsSent] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!feedback?.trim()) return

        setIsSending(true)
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            await supabase.from('beta_feedback').insert({
                content: feedback,
                user_id: user?.id || null,
                url: window.location.href,
                user_agent: navigator.userAgent
            })

            setIsSent(true)
            setFeedback('')
            setTimeout(() => {
                setIsSent(false)
                setIsOpen(false)
            }, 3000)
        } catch (error) {
            console.error('Failed to send feedback:', error)
            toast.error('Kunne ikke sende tilbakemelding. Prøv igjen senere.')
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-24 z-[60]">
            {!isOpen ? (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="rounded-full h-14 w-14 shadow-2xl bg-blue-600 hover:bg-blue-500 hover:scale-110 active:scale-95 transition-all"
                    aria-label="Gi tilbakemelding"
                >
                    <MessageSquarePlus className="w-6 h-6" />
                </Button>
            ) : (
                <Card className="w-[350px] shadow-2xl border-slate-700 bg-slate-900/95 backdrop-blur-xl animate-slide-up">
                    <CardHeader className="relative pb-4">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
                            aria-label="Lukk tilbakemelding"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <CardTitle className="text-white flex items-center gap-2">
                            <MessageSquarePlus className="w-5 h-5 text-blue-500" />
                            Tilbakemelding
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Fant du en feil? Har du et ønske? Vi hører gjerne fra deg!
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isSent ? (
                            <div className="py-8 text-center animate-in fade-in zoom-in duration-300">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                                <p className="text-white font-medium">Takk for hjelpen!</p>
                                <p className="text-sm text-slate-400 mt-1">Vi har mottatt din melding.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Textarea
                                    placeholder="Hva kan vi forbedre? Beskriv gjerne feilen hvis du fant en..."
                                    className="min-h-[120px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-blue-500 focus:border-blue-500"
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    disabled={isSending}
                                />
                                <Button
                                    type="submit"
                                    disabled={isSending || !feedback?.trim()}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Sender...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Send melding
                                        </>
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
