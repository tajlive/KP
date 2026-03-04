'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Force unregister existing workers and fetch the decommissioning script
      navigator.serviceWorker.register('/sw-v3.js?v=2026.02.11').then((registration) => {
        registration.unregister()
      })

      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister()
        }
      })
    }
  }, [])

  return null
}
