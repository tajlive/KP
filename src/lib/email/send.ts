const RESEND_API_URL = 'https://api.resend.com/emails'
const EMAIL_TIMEOUT_MS = 10_000

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[Email] RESEND_API_KEY mangler')
    return { success: false, error: new Error('RESEND_API_KEY mangler') }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS)

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Klarpakke <no-reply@klarpakke.no>',
        to,
        subject,
        html,
        text,
      }),
      signal: controller.signal,
    })

    const body = await response.json() as { id?: string; error?: string }

    if (!response.ok || body.error) {
      console.error('[Email] Feil ved sending:', response.status, body)
      return { success: false, error: new Error(body.error ?? `HTTP ${response.status}`) }
    }

    return { success: true, id: body.id }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('[Email] Timeout — kallet tok over', EMAIL_TIMEOUT_MS / 1000, 'sekunder')
      return { success: false, error: new Error('Email timeout') }
    }
    console.error('[Email] Exception:', error)
    return { success: false, error }
  } finally {
    clearTimeout(timeoutId)
  }
}
