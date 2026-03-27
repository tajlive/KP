'use client'

import { Bell, BellOff } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface PushNotificationSettingsProps {
  userId: string | null
}

export function PushNotificationSettings({ userId }: PushNotificationSettingsProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
  } = usePushNotifications(userId)

  const handleToggle = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe()
      } else {
        await subscribe()
      }
    } catch (error) {
      console.error('Toggle failed:', error)
    }
  }

  if (!isSupported) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-gray-500" />
          <div>
            <p className="text-gray-400 font-medium">Push-varsler ikke støttet</p>
            <p className="text-gray-500 text-sm">
              Din nettleser støtter ikke push-varsler. Prøv Chrome eller Safari.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isSubscribed ? 'bg-green-500/20' : 'bg-gray-700'
          }`}>
            <Bell className={`w-5 h-5 ${isSubscribed ? 'text-green-400' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-white font-medium">Push-varsler</p>
            <p className="text-gray-400 text-sm">
              {isSubscribed 
                ? 'Du mottar varsler om nye kurs og webinarer' 
                : 'Få varsler om nye kurs og webinarer'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={permission === 'denied'}
          aria-label={isSubscribed ? 'Slå av push-varsler' : 'Slå på push-varsler'}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            isSubscribed ? 'bg-green-500' : 'bg-gray-600'
          } ${permission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
              isSubscribed ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>

      {permission === 'denied' && (
        <p className="mt-3 text-amber-400 text-sm">
          Du har blokkert varsler. Endre dette i nettleserinnstillingene for å aktivere.
        </p>
      )}

      {permission === 'default' && !isSubscribed && (
        <p className="mt-3 text-gray-400 text-sm">
          Klikk på bryteren for å tillate varsler fra Klarpakke.
        </p>
      )}
    </div>
  )
}
