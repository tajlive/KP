import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from './cron'

/**
 * Verifiser at request har gyldig CRON_SECRET.
 * Kun CRON_SECRET er autoritativt for scheduler-kall.
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
