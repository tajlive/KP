import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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
