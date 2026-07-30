import { randomUUID } from 'node:crypto'
import { sendEmail, emailTemplates } from '@/lib/email/resend'
import {
  type InvariantViolation,
} from '@/lib/trading/session-invariants'

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlertType =
  | 'negative_capital'
  | 'extreme_growth'
  | 'negative_position'
  | 'session_crash'
  | 'high_error_rate'
  | 'deploy_failure'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// ─── Admin recipient ─────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'tomarnejensen@gmail.com'
const ALERT_FROM = 'Klarpakke Alarmer <alerts@klarpakke.no>'

// ─── Alert severity mapping ──────────────────────────────────────────────────

const ALERT_SEVERITY: Record<AlertType, AlertSeverity> = {
  negative_capital: 'critical',
  extreme_growth: 'warning',
  negative_position: 'critical',
  session_crash: 'critical',
  high_error_rate: 'warning',
  deploy_failure: 'critical',
}

const ALERT_TITLE: Record<AlertType, string> = {
  negative_capital: '⚠️ Negativ kapital oppdaget',
  extreme_growth: '📈 Ekstrem vekst detektert',
  negative_position: '⚠️ Negativ posisjon oppdaget',
  session_crash: '💥 Trading-sesjon krasjet',
  high_error_rate: '🔄 Høy feilrate',
  deploy_failure: '🚫 Deploy feilet',
}

// ─── sendAlert ───────────────────────────────────────────────────────────────

/**
 * Send a single alert email to the admin via Resend.
 *
 * Rate-limiting is NOT built into this function itself — callers should use
 * the `RateLimiter` class (below) or the convenience `checkAndSendAlerts()`
 * wrapper to throttle per-type alerts.
 */
export async function sendAlert(alert: Alert): Promise<{ success: boolean; error?: string }> {
  try {
    const html = emailTemplates.adminNotification(alert.title, alert.message)

    const result = await sendEmail({
      to: ADMIN_EMAIL,
      from: ALERT_FROM,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      html,
    })

    if (!result.success) {
      const errorMsg = result.error instanceof Error ? result.error.message : String(result.error)
      console.error('[alerting] sendEmail failed:', errorMsg)
      return { success: false, error: errorMsg }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[alerting] sendAlert exception:', msg)
    return { success: false, error: msg }
  }
}

// ─── RateLimiter ─────────────────────────────────────────────────────────────

/**
 * In-memory rate-limiter that allows at most 1 alert per type per 60 minutes.
 *
 * Timestamps are kept per alert-type (string) and cleaned on every check so
 * the map stays small.
 */
export class RateLimiter {
  #store: Map<string, number[]>
  #windowMs: number

  constructor(windowMs: number = 60 * 60 * 1000) {
    this.#store = new Map()
    this.#windowMs = windowMs
  }

  /** Prune timestamps outside the current window. */
  #prune(type: string): void {
    const now = Date.now()
    const cutoff = now - this.#windowMs
    const timestamps = this.#store.get(type)
    if (!timestamps) return
    const fresh = timestamps.filter((t) => t >= cutoff)
    if (fresh.length === 0) {
      this.#store.delete(type)
    } else {
      this.#store.set(type, fresh)
    }
  }

  /**
   * Returns `true` if an alert of this type can be sent — i.e. fewer than 1
   * alert of this type has been recorded in the last window.
   */
  canSend(type: AlertType): boolean {
    this.#prune(type)
    const timestamps = this.#store.get(type)
    return !timestamps || timestamps.length < 1
  }

  /** Record that an alert of this type was sent (adds a timestamp). */
  record(type: AlertType): void {
    this.#prune(type)
    const timestamps = this.#store.get(type) ?? []
    timestamps.push(Date.now())
    this.#store.set(type, timestamps)
  }
}

/** Singleton rate-limiter shared across the application. */
export const alertRateLimiter = new RateLimiter()

// ─── checkAndSendAlerts ──────────────────────────────────────────────────────

/**
 * Convert `InvariantViolation[]` from session-invariants into `Alert`s and
 * send each one subject to the shared rate-limiter.
 *
 * @returns  Summary of how many alerts were sent and the full list of alerts
 *           (including those that were rate-limited).
 */
export async function checkAndSendAlerts(
  violations: InvariantViolation[],
  rateLimiter: RateLimiter = alertRateLimiter,
): Promise<{ sent: number; alerts: Alert[] }> {
  const alerts: Alert[] = violations.map((v) => violationToAlert(v))
  let sent = 0

  for (const alert of alerts) {
    if (rateLimiter.canSend(alert.type)) {
      const result = await sendAlert(alert)
      if (result.success) {
        rateLimiter.record(alert.type)
        sent++
      } else {
        console.error('[alerting] Failed to send alert:', alert.id, result.error)
      }
    } else {
      console.debug('[alerting] Rate-limited, skipping:', alert.type, alert.id)
    }
  }

  return { sent, alerts }
}

// ─── sendDeployFailureAlert ──────────────────────────────────────────────────

/**
 * Convenience function to alert the admin about a failed deployment.
 */
export async function sendDeployFailureAlert(
  environment: string,
  error: string,
): Promise<{ success: boolean }> {
  const alert: Alert = makeAlert('deploy_failure', {
    title: `🚫 Deploy feilet — ${environment}`,
    message: `Miljø: ${environment}\n\nFeilmelding:\n${error}`,
    metadata: { environment, error },
  })

  return sendAlert(alert)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map an InvariantKind to the corresponding AlertType. */
function invariantKindToAlertType(kind: string): AlertType {
  switch (kind) {
    case 'negative_capital':
      return 'negative_capital'
    case 'extreme_growth':
      return 'extreme_growth'
    case 'negative_position':
      return 'negative_position'
    default:
      return 'high_error_rate'
  }
}

/** Convert a domain InvariantViolation into a generic Alert. */
function violationToAlert(v: InvariantViolation): Alert {
  const type = invariantKindToAlertType(v.kind)
  const detail = `Sesjon: ${v.sessionId ?? 'N/A'}\nBruker: ${v.userId ?? 'N/A'}\nVerdi: ${v.value}\nDetaljer: ${v.detail}`

  return makeAlert(type, {
    title: ALERT_TITLE[type],
    message: detail,
    metadata: {
      sessionId: v.sessionId,
      userId: v.userId,
      kind: v.kind,
      value: v.value,
    },
  })
}

/** Construct a fully-populated Alert with generated id and timestamp. */
function makeAlert(
  type: AlertType,
  overrides: Partial<Alert> & { title: string; message: string },
): Alert {
  return {
    id: randomUUID(),
    type,
    severity: overrides.severity ?? ALERT_SEVERITY[type],
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}
