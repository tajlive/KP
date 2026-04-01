'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { usePWA } from '@/lib/pwa'

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installPrompt } = usePWA()
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const now = new Date()
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setIsDismissed(true)
      }
    }

    // Show prompt automatically if installable
    console.info('PWA Status Check:', { isInstallable, isInstalled, isDismissed, isVisible });
    if (isInstallable && !isInstalled && !isDismissed && !isVisible) {
      console.info('Triggering PWA prompt visibility');
      setIsVisible(true)
    }
  }, [isInstallable, isInstalled, isDismissed, isVisible])

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString())
  }

  const handleInstall = async () => {
    try {
      await installPrompt()
      setIsVisible(false)
    } catch (error) {
      console.error('Install failed:', error)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold mb-1">
              Installer Klarpakke-appen
            </h3>
            <p className="text-gray-400 text-sm mb-3">
              Få raskere tilgang til kurs, quiz og webinarer direkte på mobilen.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Installer
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Ikke nå
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
