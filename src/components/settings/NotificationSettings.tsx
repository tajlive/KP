'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/utils'
import { Bell, BellOff, Loader2, Moon, TrendingUp, Wallet, Trophy, Newspaper, AlertTriangle, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

interface NotificationPrefs {
    push_notifications: boolean
    push_price_alerts: boolean
    push_trading_signals: boolean
    push_stop_loss: boolean
    push_portfolio_updates: boolean
    push_market_news: boolean
    push_competition: boolean
    push_transactions: boolean
    quiet_hours_enabled: boolean
    quiet_hours_start: string
    quiet_hours_end: string
}

const defaultPrefs: NotificationPrefs = {
    push_notifications: true,
    push_price_alerts: true,
    push_trading_signals: true,
    push_stop_loss: true,
    push_portfolio_updates: false,
    push_market_news: false,
    push_competition: true,
    push_transactions: true,
    quiet_hours_enabled: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
}

export default function NotificationSettings() {
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [loading, setLoading] = useState(true)
    const [isSupported, setIsSupported] = useState(false)
    const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs)
    const [saving, setSaving] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            loadPreferences()
            registerServiceWorker()
        } else {
            setLoading(false)
        }
    }, [])

    async function loadPreferences() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data, error } = await supabase
                    .from('notification_preferences')
                    .select('*')
                    .eq('user_id', user.id)
                    .single()
                
                if (data && !error) {
                    setPrefs({
                        ...defaultPrefs,
                        ...data,
                    })
                }
            }
        } catch (error) {
            console.error('Error loading preferences:', error)
        }
    }

    async function savePreferences(newPrefs: NotificationPrefs) {
        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { error } = await supabase
                    .from('notification_preferences')
                    .upsert({
                        user_id: user.id,
                        ...newPrefs,
                        updated_at: new Date().toISOString(),
                    })
                
                if (error) throw error
                setPrefs(newPrefs)
                toast.success('Innstillinger lagret!')
            }
        } catch (error) {
            toast.error('Kunne ikke lagre innstillinger')
        } finally {
            setSaving(false)
        }
    }

    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/push-sw.js')
            const subscription = await registration.pushManager.getSubscription()
            setIsSubscribed(!!subscription)
        } catch (error) {
            console.error('Service Worker registration failed:', error)
        } finally {
            setLoading(false)
        }
    }

    async function toggleSubscription() {
        setLoading(true)
        try {
            if (isSubscribed) {
                await unsubscribe()
            } else {
                await subscribe()
            }
        } catch (error) {
            console.error('Subscription error:', error)
            toast.error('Kunne ikke oppdatere varslinger')
        } finally {
            setLoading(false)
        }
    }

    async function subscribe() {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
            toast.error('Du må godta varsler i nettleseren')
            return
        }

        const registration = await navigator.serviceWorker.ready
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

        if (!vapidKey) {
            toast.error('VAPID key mangler i konfigurasjon')
            return
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey)
        })

        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const keys = subscription.toJSON().keys;
            if (!keys?.p256dh || !keys?.auth) {
                throw new Error('Push subscription keys missing');
            }
            await supabase.from('push_subscriptions').insert({
                user_id: user.id,
                endpoint: subscription.endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth
            })

            // Create notification preferences if not exists
            await supabase.from('notification_preferences').upsert({
                user_id: user.id,
                ...prefs,
                push_notifications: true,
            })
        }

        setIsSubscribed(true)
        toast.success('Push-varslinger aktivert! 🔔')
    }

    async function unsubscribe() {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        if (subscription) {
            await subscription.unsubscribe()
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                await supabase.from('push_subscriptions').delete().match({
                    user_id: user.id,
                    endpoint: subscription.endpoint
                })
            }
        }

        setIsSubscribed(false)
        toast.success('Push-varslinger deaktivert')
    }

    const togglePref = (key: keyof NotificationPrefs) => {
        const newPrefs = { ...prefs, [key]: !prefs[key] }
        savePreferences(newPrefs)
    }

    if (!isSupported) {
        return (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                Din nettleser støtter ikke push-varslinger.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Main Toggle */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Bell className="w-5 h-5 text-blue-400" />
                            Push-varslinger
                        </h3>
                        <p className="text-sm text-slate-400">
                            Få beskjed om viktige hendelser direkte på enheten din.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
                        <Switch
                            checked={isSubscribed}
                            onCheckedChange={toggleSubscription}
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>

            {/* Notification Types */}
            {isSubscribed && (
                <>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h4 className="text-white font-medium mb-4">Hva vil du varsles om?</h4>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                    <div>
                                        <p className="text-white text-sm">Prisalarmer</p>
                                        <p className="text-slate-500 text-xs">Når dine valutaer når målpris</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={prefs.push_price_alerts}
                                    onCheckedChange={() => togglePref('push_price_alerts')}
                                    disabled={saving}
                                />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <Bell className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <p className="text-white text-sm">Trading-signaler</p>
                                        <p className="text-slate-500 text-xs">Nye kjøps- og salgsanbefalinger</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={prefs.push_trading_signals}
                                    onCheckedChange={() => togglePref('push_trading_signals')}
                                    disabled={saving}
                                />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                    <div>
                                        <p className="text-white text-sm">Stop-loss / Take-profit</p>
                                        <p className="text-slate-500 text-xs">Kritiske handler (alltid på)</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={prefs.push_stop_loss}
                                    onCheckedChange={() => togglePref('push_stop_loss')}
                                    disabled={saving}
                                />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <DollarSign className="w-5 h-5 text-yellow-400" />
                                    <div>
                                        <p className="text-white text-sm">Transaksjoner</p>
                                        <p className="text-slate-500 text-xs">Innskudd, uttak, handler</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={prefs.push_transactions}
                                    onCheckedChange={() => togglePref('push_transactions')}
                                    disabled={saving}
                                />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <Wallet className="w-5 h-5 text-emerald-400" />
                                    <div>
                                        <p className="text-white text-sm">Porteføljeoppdateringer</p>
                                        <p className="text-slate-500 text-xs">Daglig oppsummering</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={prefs.push_portfolio_updates}
                                    onCheckedChange={() => togglePref('push_portfolio_updates')}
                                    disabled={saving}
                                />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <Newspaper className="w-5 h-5 text-orange-400" />
                                    <div>
                                        <p className="text-white text-sm">Markedsnyheter</p>
                                        <p className="text-slate-500 text-xs">Viktige hendelser</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={prefs.push_market_news}
                                    onCheckedChange={() => togglePref('push_market_news')}
                                    disabled={saving}
                                />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <Trophy className="w-5 h-5 text-amber-400" />
                                    <div>
                                        <p className="text-white text-sm">Konkurranser</p>
                                        <p className="text-slate-500 text-xs">Leaderboard, ligaer</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={prefs.push_competition}
                                    onCheckedChange={() => togglePref('push_competition')}
                                    disabled={saving}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quiet Hours */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Moon className="w-5 h-5 text-indigo-400" />
                                <div>
                                    <p className="text-white font-medium">Stille timer</p>
                                    <p className="text-slate-500 text-xs">Ingen varsler på kvelden (unntatt kritiske)</p>
                                </div>
                            </div>
                            <Switch
                                checked={prefs.quiet_hours_enabled}
                                onCheckedChange={() => togglePref('quiet_hours_enabled')}
                                disabled={saving}
                            />
                        </div>

                        {prefs.quiet_hours_enabled && (
                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-800">
                                <div className="flex-1">
                                    <label htmlFor="quiet-hours-start" className="text-slate-400 text-xs">Fra</label>
                                    <input
                                        id="quiet-hours-start"
                                        type="time"
                                        value={prefs.quiet_hours_start}
                                        onChange={(e) => {
                                            const newPrefs = { ...prefs, quiet_hours_start: e.target.value }
                                            savePreferences(newPrefs)
                                        }}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1"
                                    />
                                </div>
                                <div className="text-slate-500">til</div>
                                <div className="flex-1">
                                    <label htmlFor="quiet-hours-end" className="text-slate-400 text-xs">Til</label>
                                    <input
                                        id="quiet-hours-end"
                                        type="time"
                                        value={prefs.quiet_hours_end}
                                        onChange={(e) => {
                                            const newPrefs = { ...prefs, quiet_hours_end: e.target.value }
                                            savePreferences(newPrefs)
                                        }}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
