'use client';

import { motion } from 'framer-motion';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  type LucideIcon 
} from 'lucide-react';

export type StatusType = 
  | 'loading' 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'pending'
  | 'inactive';

interface StatusConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  title: string;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  loading: {
    icon: Loader2,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    title: 'Laster...',
  },
  success: {
    icon: CheckCircle2,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    title: 'Fullført',
  },
  error: {
    icon: XCircle,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    title: 'Feil',
  },
  warning: {
    icon: AlertCircle,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    title: 'Advarsel',
  },
  pending: {
    icon: RefreshCw,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    title: 'Venter...',
  },
  inactive: {
    icon: AlertCircle,
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    title: 'Inaktiv',
  },
};

interface StatusIndicatorProps {
  status: StatusType;
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
  className?: string;
}

export function StatusIndicator({
  status,
  title,
  message,
  action,
  compact = false,
  className = '',
}: StatusIndicatorProps) {
  const config = statusConfigs[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div 
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${className}`}
        style={{ backgroundColor: config.bgColor }}
      >
        <Icon 
          size={14} 
          style={{ color: config.color }}
          className={status === 'loading' || status === 'pending' ? 'animate-spin' : ''}
        />
        <span style={{ color: config.color }}>{title || config.title}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border ${className}`}
      style={{
        backgroundColor: config.bgColor,
        borderColor: `${config.color}30`,
      }}
    >
      <div className="flex items-start gap-3">
        <Icon
          size={20}
          style={{ color: config.color }}
          className={status === 'loading' || status === 'pending' ? 'animate-spin mt-0.5' : 'mt-0.5'}
        />
        <div className="flex-1">
          <p className="font-medium text-white mb-1">
            {title || config.title}
          </p>
          {message && (
            <p className="text-sm text-white/60 mb-3">{message}</p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Preset components for common use cases
export function PaymentPendingStatus({ className }: { className?: string }) {
  return (
    <StatusIndicator
      status="pending"
      title="Betaling behandles"
      message="Betalingen din er under behandling. Dette tar vanligvis mindre enn ett minutt."
      className={className}
    />
  );
}

export function PaymentFailedStatus({ 
  onRetry,
  className 
}: { 
  onRetry?: () => void;
  className?: string 
}) {
  return (
    <StatusIndicator
      status="error"
      title="Betaling mislyktes"
      message="Vi kun ikke behandle betalingen din. Sjekk at betalingskortet er gyldig og prøv igjen."
      action={onRetry ? { label: 'Prøv igjen', onClick: onRetry } : undefined}
      className={className}
    />
  );
}

export function SubscriptionInactiveStatus({ 
  onSubscribe,
  className 
}: { 
  onSubscribe?: () => void;
  className?: string 
}) {
  return (
    <StatusIndicator
      status="inactive"
      title="Inaktivt abonnement"
      message="Abonnementet ditt er ikke aktivt. Oppgrader for å fortsette å bruke alle funksjoner."
      action={onSubscribe ? { label: 'Oppgrader nå', onClick: onSubscribe } : undefined}
      className={className}
    />
  );
}

export function SyncInProgressStatus({ className }: { className?: string }) {
  return (
    <StatusIndicator
      status="loading"
      title="Synkroniserer..."
      message="Data synkroniseres med serveren. Vent litt..."
      className={className}
    />
  );
}
