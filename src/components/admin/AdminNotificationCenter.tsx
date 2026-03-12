'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Bell,
    CheckCircle,
    AlertCircle,
    X,
    Eye
} from 'lucide-react'

interface Notification {
    id: string
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    priority: 'low' | 'normal' | 'high' | 'urgent'
    read: boolean
    action_url?: string
    created_at: string
}

export function AdminNotificationCenter() {
    const supabase = createClient()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [showPanel, setShowPanel] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchNotifications()
        subscribeToNotifications()
    }, [])

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('admin_notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20)

            if (error) throw error

            setNotifications(data || [])
            setUnreadCount(data?.filter(n => !n.read).length || 0)
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    const subscribeToNotifications = () => {
        const channel = supabase
            .channel('admin_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'admin_notifications',
                },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev])
                    setUnreadCount(prev => prev + 1)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }

    const markAsRead = async (id: string) => {
        try {
            await supabase
                .from('admin_notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('id', id)

            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, read: true } : n))
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            console.error('Failed to mark as read:', error)
        }
    }

    const markAllAsRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.read).map(n => n.id)

            await supabase
                .from('admin_notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .in('id', unreadIds)

            setNotifications(prev => prev.map(n => ({ ...n, read: true })))
            setUnreadCount(0)
        } catch (error) {
            console.error('Failed to mark all as read:', error)
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-500" />
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-500" />
            default:
                return <Bell className="w-5 h-5 text-blue-500" />
        }
    }

    return (
        <div className="relative">
            {/* Notification Bell */}
            <button
                onClick={() => setShowPanel(!showPanel)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {showPanel && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowPanel(false)}
                    />
                    <div className="absolute right-0 top-12 w-96 max-h-[600px] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                            <h3 className="text-white font-semibold">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={markAllAsRead}
                                        className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                        Mark all read
                                    </Button>
                                )}
                                <button
                                    onClick={() => setShowPanel(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto max-h-[500px]">
                            {loading ? (
                                <div className="p-8 text-center">
                                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No notifications</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-700">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-slate-700/50 transition-colors ${!notification.read ? 'bg-slate-700/30' : ''
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5">{getTypeIcon(notification.type)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="text-white font-medium text-sm">
                                                            {notification.title}
                                                        </h4>
                                                        {!notification.read && (
                                                            <button
                                                                onClick={() => markAsRead(notification.id)}
                                                                className="text-blue-400 hover:text-blue-300"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-slate-400 text-sm mt-1">
                                                        {notification.message}
                                                    </p>
                                                    {notification.action_url && (
                                                        <a
                                                            href={notification.action_url}
                                                            className="inline-block mt-2 text-xs text-blue-400 hover:text-blue-300"
                                                            onClick={() => markAsRead(notification.id)}
                                                        >
                                                            View details →
                                                        </a>
                                                    )}
                                                    <p className="text-xs text-slate-500 mt-2">
                                                        {notification.created_at ? new Date(notification.created_at).toLocaleString('no') : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
