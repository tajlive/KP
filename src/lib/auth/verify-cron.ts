import { NextRequest, NextResponse } from 'next/server'

/**
 * Verifiser at request kommer fra Vercel Cron eller har gyldig CRON_SECRET
 */
export function verifyCronRequest(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET ikke satt!')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }
  
  // Sjekk Authorization header
  if (authHeader === `Bearer ${cronSecret}`) {
    return null // OK
  }
  
  // Sjekk Vercel Cron header (automatisk satt av Vercel)
  const vercelCron = req.headers.get('x-vercel-cron')
  if (vercelCron === '1') {
    return null // OK
  }
  
  // Unauthorized
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}
