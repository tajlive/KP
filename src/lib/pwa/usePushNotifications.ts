'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/utils'

interface PushState {
  isSupported: boolean
  permission: NotificationPermission | null
  isSubscribed: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

export function usePushNotifications(userId: string | null): PushState {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Check if push is supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    setIsSupported(supported)

    if (!supported) return

    // Get current permission
    setPermission(Notification.permission)

    // Check if already subscribed
    checkSubscription()
  }, [userId])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      setSwRegistration(registration)

      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }

  const subscribe = useCallback(async () => {
    if (!userId || !swRegistration) return

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)

      if (permissionResult !== 'granted') {
        throw new Error('Permission denied')
      }

      // Get VAPID public key from environment variable
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) {
        throw new Error('VAPID public key not available')
      }

      // Subscribe to push
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // Save subscription to Supabase
      const supabase = createClient()
      await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          subscription: subscription.toJSON(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'endpoint' })

      setIsSubscribed(true)
      console.info('Push subscription successful')
    } catch (error) {
      console.error('Error subscribing to push:', error)
      throw error
    }
  }, [userId, swRegistration])

  const unsubscribe = useCallback(async () => {
    if (!swRegistration) return

    try {
      const subscription = await swRegistration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from push
        await subscription.unsubscribe()

        // Remove from Supabase
        const supabase = createClient()
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint)

        setIsSubscribed(false)
        console.info('Push unsubscription successful')
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error)
      throw error
    }
  }, [swRegistration])

  return {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
  }
}

// Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray.buffer
}
