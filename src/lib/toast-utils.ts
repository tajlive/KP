import { toast } from 'sonner';

/**
 * Contextual toast notifications with error codes and support links.
 * Use instead of raw toast.error() / toast.success() for better UX.
 */

let toastCounter = 0;

function generateId(): string {
  return `t-${Date.now()}-${++toastCounter}`;
}

export function toastError(
  message: string,
  opts?: {
    code?: string;
    details?: string;
    showSupport?: boolean;
    duration?: number;
  }
) {
  const id = generateId();
  const code = opts?.code || 'ERR';
  const supportText = opts?.showSupport !== false
    ? ` • Ref: ${code}-${id.slice(-6)}`
    : '';

  toast.error(message, {
    description: opts?.details
      ? `${opts.details}${supportText}`
      : supportText || undefined,
    duration: opts?.duration || 5000,
    id,
  });

  if (process.env.NODE_ENV === 'production') {
    console.error(`[Toast ${code}-${id}]`, message, opts?.details || '');
  }

  return id;
}

export function toastSuccess(
  message: string,
  opts?: { description?: string; duration?: number }
) {
  toast.success(message, {
    description: opts?.description,
    duration: opts?.duration || 3000,
  });
}

// Pre-defined error toasts for common scenarios
export const toasts = {
  authRequired: () => toastError('Du må være logget inn', { code: 'AUTH' }),
  networkError: () => toastError('Nettverksfeil', {
    code: 'NET',
    details: 'Sjekk internettforbindelsen din og prøv igjen',
  }),
  saveFailed: (what?: string) => toastError(
    `Kunne ikke lagre${what ? ` ${what}` : ''}`,
    { code: 'SAVE', showSupport: true }
  ),
  loadFailed: (what?: string) => toastError(
    `Kunne ikke laste${what ? ` ${what}` : ''}`,
    { code: 'LOAD', showSupport: true }
  ),
  deleteFailed: (what?: string) => toastError(
    `Kunne ikke slette${what ? ` ${what}` : ''}`,
    { code: 'DEL', showSupport: true }
  ),
  tradeFailed: (details?: string) => toastError(
    'Handel mislyktes',
    { code: 'TRADE', details, showSupport: true }
  ),
  tradeSuccess: (symbol: string, side: string) => toastSuccess(
    `${side === 'buy' ? 'Kjøpt' : 'Solgt'} ${symbol}`,
  ),
  copied: (what?: string) => toastSuccess(
    `${what || 'Kopiert'} til utklippstavlen`,
  ),
  strategyStarted: (name: string) => toastSuccess(`${name} er startet`),
  strategyStopped: (name: string) => toastSuccess(`${name} er stoppet`),
} as const;
