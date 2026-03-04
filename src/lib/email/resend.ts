import { Resend } from 'resend'

// Initialize Resend
// Initialize Resend with fallback for build time
const resend = new Resend(process.env.RESEND_API_KEY || 'fake_key_for_build')

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

export async function sendEmail({
  to,
  subject,
  html,
  from = 'Klarpakke Universitet \u003cno-reply@klarpakke.no\u003e',
  replyTo,
}: SendEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo,
    })

    if (error) {
      console.error('Resend email error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email sending error:', error)
    return { success: false, error }
  }
}

// Email templates
export const emailTemplates = {
  betaApproval: (name: string, email: string) => `
    \u003c!DOCTYPE html\u003e
    \u003chtml\u003e
      \u003chead\u003e
        \u003cmeta charset="utf-8"\u003e
        \u003cstyle\u003e
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        \u003c/style\u003e
      \u003c/head\u003e
      \u003cbody\u003e
        \u003cdiv class="container"\u003e
          \u003cdiv class="header"\u003e
            \u003ch1\u003e🎉 Velkommen til Klarpakke Universitet!\u003c/h1\u003e
          \u003c/div\u003e
          \u003cdiv class="content"\u003e
            \u003cp\u003eHei ${name || email.split('@')[0]},\u003c/p\u003e
            \u003cp\u003eGratulerer! Din søknad om beta-tilgang til Klarpakke Universitet er godkjent.\u003c/p\u003e
            \u003cp\u003eDu kan nå logge inn og begynne å utforske plattformen:\u003c/p\u003e
            \u003ca href="https://www.klarpakke.no/no/innlogging" class="button"\u003eLogg inn nå\u003c/a\u003e
            \u003cp\u003e\u003cstrong\u003eHva kan du gjøre nå?\u003c/strong\u003e\u003c/p\u003e
            \u003cul\u003e
              \u003cli\u003eFullføre ditt første kurs\u003c/li\u003e
              \u003cli\u003eKoble til Binance for live trading\u003c/li\u003e
              \u003cli\u003eUtforske paper trading\u003c/li\u003e
              \u003cli\u003eDelta i community\u003c/li\u003e
            \u003c/ul\u003e
            \u003cp\u003eVi gleder oss til å se deg på plattformen!\u003c/p\u003e
            \u003cp\u003eMvh,\u003cbr\u003eKlarpakke-teamet\u003c/p\u003e
          \u003c/div\u003e
          \u003cdiv class="footer"\u003e
            \u003cp\u003e© 2026 Klarpakke Universitet. Alle rettigheter reservert.\u003c/p\u003e
          \u003c/div\u003e
        \u003c/div\u003e
      \u003c/body\u003e
    \u003c/html\u003e
  `,

  adminNotification: (title: string, message: string, actionUrl?: string) => `
    \u003c!DOCTYPE html\u003e
    \u003chtml\u003e
      \u003chead\u003e
        \u003cmeta charset="utf-8"\u003e
        \u003cstyle\u003e
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e293b; color: white; padding: 20px; border-radius: 10px 10px 0 0; }
          .content { background: #f1f5f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        \u003c/style\u003e
      \u003c/head\u003e
      \u003cbody\u003e
        \u003cdiv class="container"\u003e
          \u003cdiv class="header"\u003e
            \u003ch2\u003e🔔 ${title}\u003c/h2\u003e
          \u003c/div\u003e
          \u003cdiv class="content"\u003e
            \u003cp\u003e${message}\u003c/p\u003e
            ${actionUrl ? `\u003ca href="${actionUrl}" class="button"\u003eVis detaljer\u003c/a\u003e` : ''}
          \u003c/div\u003e
        \u003c/div\u003e
      \u003c/body\u003e
    \u003c/html\u003e
  `,
}
