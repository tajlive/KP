'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, User, Mail, Bell, Shield } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getErrorMessage } from '@/lib/utils/error'

export function SettingsForm() {
    const t = useTranslations('dashboard.settingsPage')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [user, setUser] = useState<{ email?: string } | null>(null)
    const [fullName, setFullName] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const supabase = createClient()

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '')
            }
            setLoading(false)
        }
        loadProfile()
    }, [supabase])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)

        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            })

            if (error) throw error
            setMessage({ type: 'success', text: t('profileUpdated') })
        } catch (error: unknown) {
            setMessage({ type: 'error', text: getErrorMessage(error) })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-400" />
                        {t('personalInfo')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                            <label htmlFor="settings-email" className="block text-sm text-slate-400 mb-2">{t('email')}</label>
                            <div id="settings-email" role="textbox" aria-readonly="true" className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-500">
                                <Mail className="w-4 h-4" />
                                {user?.email}
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{t('emailNote')}</p>
                        </div>

                        <div>
                            <label htmlFor="settings-fullname" className="block text-sm text-slate-400 mb-2">{t('fullName')}</label>
                            <input
                                id="settings-fullname"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700 focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder={t('namePlaceholder')}
                            />
                        </div>

                        {message && (
                            <div className={`p-3 rounded-lg text-sm ${message.type === 'success'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        <Button type="submit" disabled={saving} className="w-full">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {t('saveChanges')}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="space-y-8">
                <Card className="bg-slate-900 border-slate-800 opacity-60">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Bell className="w-5 h-5 text-emerald-400" />
                            {t('notifications')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-500 text-sm">{t('notificationsComingSoon')}</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 opacity-60">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-green-400" />
                            {t('security')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-500 text-sm">{t('securityDesc')}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
