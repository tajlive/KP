import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from './cron'

/**
 * Verifiser at request har gyldig CRON_SECRET.
 * x-vercel-cron er en legacy Vercel/Fly.io-header og ignoreres.
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
