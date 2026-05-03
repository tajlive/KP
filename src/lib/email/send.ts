import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY mangler')
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }

  return resendClient
}

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
  try {
    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: 'Klarpakke <no-reply@klarpakke.no>',
      to,
      subject,
      html,
      text,
    })
    
    if (error) {
      console.error('[Email] Feil ved sending:', error)
      return { success: false, error }
    }
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception:', error)
    return { success: false, error }
  }
}
