import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from './cron'

/**
 * Verifiser at request har gyldig CRON_SECRET.
 * Tidligere aksepterte vi også x-vercel-cron header og ?secret= query param —
 * fjernet ved migrering til Fly.io.
 */
export function verifyCronRequest(req: NextRequest): NextResponse | null {
  if (!validateCronSecret(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return null // OK
}
