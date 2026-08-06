# sendToSentry — komplett implementasjon

Plassert i `src/lib/sentry.ts`. Funksjonen `sendToSentry()` sender events til Sentry via envelope API.

## Envelope format

```
JSON header line
\n
JSON item header line
\n
JSON item body (the event)
```

## Kode

```typescript
async function sendToSentry(event: Record<string, unknown>) {
  try {
    const dsnValue = process.env.NEXT_PUBLIC_GLITCHTIP_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsnValue) return;

    const dsnUrl = new URL(dsnValue);
    const projectId = dsnUrl.pathname.replace("/", "");
    const host = dsnUrl.hostname;
    const protocol = dsnUrl.protocol;
    const port = dsnUrl.port ? `:${dsnUrl.port}` : "";

    const url = `${protocol}//${host}${port}/api/${projectId}/envelope/`;

    const envelopeHeader = JSON.stringify({
      event_id: event.eventId,
      dsn: dsnValue,
      sent_at: new Date().toISOString(),
      sdk: { name: "klarpakke-sentry", version: "1.0.0" },
    });

    const itemHeader = JSON.stringify({
      type: "event",
      content_type: "application/json",
    });

    const itemBody = JSON.stringify({
      event_id: event.eventId,
      timestamp: event.timestamp,
      level: event.level,
      logger: "hermes",
      message: event.message || event.logentry,
      exception: event.exception ? { values: [event.exception] } : undefined,
      tags: (event.tags as Record<string, string>) || {},
      extra: (event.extra as Record<string, unknown>) || {},
      user: (event.user as Record<string, unknown>) || {},
      logentry: event.logentry,
      platform: "javascript",
      sdk: { name: "klarpakke-sentry", version: "1.0.0" },
    });

    const envelope = `${envelopeHeader}\n${itemHeader}\n${itemBody}`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
    });
  } catch {
    // Silent — don't crash the app if Sentry is unreachable
  }
}
```

## Feilsøking

| HTTP Status | Problem | Fiks |
|-------------|---------|------|
| 400 | Feil format på payload | Bruk envelope-format (header + item header + item body) |
| 401 | Ugyldig auth | Envelope API bruker DSN i header, ikke `sentry_key` query param |
| 403 | CSP blokkert | Legg til `*.ingest.de.sentry.io` i CSP connect-src |
| 0 / timeout | Nettverksfeil | Sjekk at URL-en er riktig: `{host}/api/{projectId}/envelope/` |

## Test

```typescript
import { testSentry } from "@/lib/sentry";
testSentry();  // Sender test event + test error til Sentry
```

## Verifisert (2026-07-20)

Python-test mot produksjon ga HTTP 200 med event ID:
```python
import requests, json, uuid
event_id = uuid.uuid4().hex
dsn = 'https://beff674f32d350fe882f0d8a1c75566a@o4511701230747648.ingest.de.sentry.io/4511701234483280'
header = json.dumps({'event_id': event_id, 'dsn': dsn, 'sent_at': '...', 'sdk': {'name': 'test', 'version': '1.0.0'}})
item_header = json.dumps({'type': 'event', 'content_type': 'application/json'})
item_body = json.dumps({'event_id': event_id, 'level': 'info', 'message': 'test', 'platform': 'javascript'})
envelope = header + '\n' + item_header + '\n' + item_body
r = requests.post('https://o4511701230747648.ingest.de.sentry.io/api/4511701234483280/envelope/',
                  headers={'Content-Type': 'application/x-sentry-envelope'}, data=envelope)
print(r.status_code, r.text)  # HTTP 200 {"id":"cbdca45cc0f64950a1a2277ffed24093"}
```
