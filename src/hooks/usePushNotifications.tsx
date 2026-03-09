'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/utils'

interface PushNotificationManagerProps {
    userId: string
}

export function usePushNotifications({ userId }: PushNotificationManagerProps) {
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)
    const [isSupported, setIsSupported] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        // Check if push notifications are supported
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            checkSubscription()
        }
    }, [])

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready
            const sub = await registration.pushManager.getSubscription()

            if (sub) {
                setSubscription(sub)
                setIsSubscribed(true)
            }
        } catch (error) {
            console.error('Error checking subscription:', error)
        }
    }

    const subscribe = async () => {
        if (!isSupported) {
            toast.error('Push notifications are not supported in this browser')
            return
        }

        setIsLoading(true)

        try {
            // Request notification permission
            const permission = await Notification.requestPermission()

            if (permission !== 'granted') {
                toast.error('Notification permission denied')
                setIsLoading(false)
                return
            }

            // Register service worker
            const registration = await navigator.serviceWorker.register('/push-sw.js')
            await navigator.serviceWorker.ready

            // Get VAPID public key from environment
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

            if (!vapidPublicKey) {
                console.error('VAPID public key not configured')
                setIsLoading(false)
                return
            }

            // Subscribe to push notifications
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
            })

            // Save subscription to database
            const { error } = await supabase.from('push_subscriptions').insert({
                user_id: userId,
                endpoint: sub.endpoint,
                p256dh: arrayBufferToBase64(sub.getKey('p256dh')!),
                auth: arrayBufferToBase64(sub.getKey('auth')!),
                user_agent: navigator.userAgent,
            })

            if (error) throw error

            setSubscription(sub)
            setIsSubscribed(true)
        } catch (error) {
            console.error('Error subscribing to push notifications:', error)
            toast.error('Failed to subscribe to push notifications')
        } finally {
            setIsLoading(false)
        }
    }

    const unsubscribe = async () => {
        if (!subscription) return

        setIsLoading(true)

        try {
            await subscription.unsubscribe()

            // Remove from database
            const { error } = await supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', subscription.endpoint)

            if (error) throw error

            setSubscription(null)
            setIsSubscribed(false)
        } catch (error) {
            console.error('Error unsubscribing:', error)
            toast.error('Failed to unsubscribe from push notifications')
        } finally {
            setIsLoading(false)
        }
    }

    return {
        isSupported,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
    }
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
}
