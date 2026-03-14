import { Resend } from 'resend'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }

  return new Resend(apiKey)
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
    if (!resend) {
      console.warn('[Email] RESEND_API_KEY mangler, hopper over sending')
      return { success: false, error: 'RESEND_API_KEY mangler' }
    }

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
    
    console.info('[Email] Sendt:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception:', error)
    return { success: false, error }
  }
}
