import { NextRequest, NextResponse } from 'next/server'

/**
 * Verifiser at request har gyldig CRON_SECRET.
 * Tidligere aksepterte vi også x-vercel-cron header — fjernet ved migrering til Fly.io.
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
  
  // Unauthorized
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}
