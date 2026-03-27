# Script 09: Push Notifications

Web Push notifikasjoner for Klarpakke med VAPID.

## Oppsummering

Dette scriptet implementerer Web Push API for Klarpakke, som muliggjør:
- Push-varsler til brukere selv når appen er lukket
- Støtte for iOS 16.4+ (Safari Web Push)
- Admin-API for sending av varsler
- Bruker-preferanser for notifikasjoner

## Filer implementert

### Backend

| Fil | Beskrivelse |
|-----|-------------|
| `src/app/api/notifications/subscribe/route.ts` | POST: Lagre push subscription |
| `src/app/api/notifications/unsubscribe/route.ts` | POST: Fjern push subscription |
| `src/app/api/notifications/send/route.ts` | POST: Send push (admin/internal) |

### Frontend

| Fil | Beskrivelse |
|-----|-------------|
| `public/push-sw.js` | Service worker for push håndtering |
| `src/hooks/usePushNotifications.ts` | Hook for push management |
| `src/components/notifications/PushNotificationToggle.tsx` | UI komponent for toggle |

### Database

Migrasjon: `supabase/migrations/20260208000001_push_notifications.sql`

Tabell: `push_subscriptions`
- `id` (uuid, pk)
- `user_id` (uuid, fk til auth.users)
- `endpoint` (text, unique)
- `p256dh` (text)
- `auth` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Miljøvariabler

Legg til i `.env.local`:

```bash
# VAPID Keys (generer med: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BP...
VAPID_PRIVATE_KEY=MP...
VAPID_SUBJECT=mailto:admin@klarpakke.no
```

### Generer VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Kopier public key til `NEXT_PUBLIC_VAPID_PUBLIC_KEY` og private key til `VAPID_PRIVATE_KEY`.

## Bruk

### 1. I komponent

```tsx
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";

function SettingsPage() {
  return (
    <PushNotificationToggle 
      userId={user?.id} 
      variant="card"
      onChange={(isSubscribed) => console.log("Subscribed:", isSubscribed)}
    />
  );
}
```

### 2. Med hook

```tsx
import { usePushNotifications } from "@/hooks/usePushNotifications";

function CustomComponent() {
  const { 
    isSupported, 
    isSubscribed, 
    subscribe, 
    unsubscribe,
    permission 
  } = usePushNotifications(userId);

  if (!isSupported) return <div>Push not supported</div>;

  return (
    <button onClick={isSubscribed ? unsubscribe : subscribe}>
      {isSubscribed ? "Unsubscribe" : "Subscribe"}
    </button>
  );
}
```

### 3. Sende varsler (admin)

```bash
curl -X POST https://www.klarpakke.no/api/notifications/send \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "broadcast": true,
    "notification": {
      "title": "Nytt signal!",
      "body": "BTC/USDT har generert et kjøpssignal",
      "url": "/dashboard",
      "icon": "/icons/icon-192x192.png"
    }
  }'
```

Send til spesifikke brukere:

```bash
curl -X POST https://www.klarpakke.no/api/notifications/send \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["uuid-1", "uuid-2"],
    "notification": {
      "title": "Din bot har utført en handel",
      "body": "Solgte 0.5 BTC til 65,000 USDT",
      "url": "/dashboard/bots/123"
    }
  }'
```

### 4. Hent statistikk

```bash
curl https://www.klarpakke.no/api/notifications/send \
  -H "Authorization: Bearer $CRON_SECRET"
```

Response:
```json
{
  "totalSubscriptions": 150,
  "uniqueUsers": 120,
  "vapidConfigured": true
}
```

## iOS Safari støtte

iOS 16.4+ støtter Web Push. Brukeren må:
1. Legge til appen på hjemmeskjermen (Add to Home Screen)
2. Godta push-tillatelse

Service workeren håndterer iOS-spesifikke begrensninger automatisk.

## Testing

1. **Lokal testing:**
   - Sett VAPID keys i `.env.local`
   - Kjør `npm run dev`
   - Gå til `/innstillinger`
   - Test push toggle

2. **Send test varsel:**
   ```bash
   npm run push:test
   ```
   (hvis test script er implementert)

## Feilsøking

| Problem | Løsning |
|---------|---------|
| "Push not supported" | Bruk Chrome, Edge, eller Safari 16.4+ |
| "Permission denied" | Sjekk nettleser-innstillinger for varsler |
| "VAPID key mangler" | Sjekk at env variabler er satt |
| Varsler kommer ikke | Sjekk service worker er registrert i DevTools > Application |
| iOS: ingen varsler | Sjekk at appen er lagt til hjemmeskjermen |

## Sikkerhet

- VAPID private key skal aldri eksponeres i klientkoden
- Send-endepunktet krever `CRON_SECRET` eller service role
- Subscriptions er knyttet til user_id med RLS policies

## RLS Policies

```sql
-- Users can view their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all
CREATE POLICY "Service role can manage push subscriptions"
  ON push_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);
```

## Videre utvikling

- [ ] Quiet hours (stille timer)
- [ ] Kategoribaserte varsler (pris, trading, nyheter)
- [ ] Batch sending for store mengder
- [ ] Push analytics (åpne-rate, klikk-rate)
- [ ] Rich notifications med bilder
