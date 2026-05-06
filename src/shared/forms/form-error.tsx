/**
 * Form Error Components
 * Display validation and form errors
 */


import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================
// ALERT VARIANTS
// ============================================================

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 text-sm flex gap-3',
  {
    variants: {
      variant: {
        default: 'bg-slate-50 border-slate-200 text-slate-900',
        error: 'bg-red-50 border-red-200 text-red-900',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
        success: 'bg-green-50 border-green-200 text-green-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface AlertProps extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof alertVariants> {
  title?: string;
  icon?: React.ReactNode;
}

export function Alert({
  variant,
  title,
  icon,
  className,
  children,
  ...props
}: AlertProps) {
  const iconMap = {
    error: <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />,
    success: <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 shrink-0 mt-0.5" />,
    default: null,
  };

  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      role="alert"
      {...props}
    >
      <div className="shrink-0">
        {icon || iconMap[variant as keyof typeof iconMap]}
      </div>
      <div className="flex-1">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// ERROR MESSAGE COMPONENT
// ============================================================

interface ErrorMessageProps {
  message?: string;
  errors?: Record<string, string | string[]>;
  className?: string;
}

export function ErrorMessage({
  message,
  errors,
  className,
}: ErrorMessageProps) {
  if (!message && (!errors || Object.keys(errors).length === 0)) {
    return null;
  }

  const errorList = errors
    ? Object.entries(errors)
        .flatMap(([key, value]) => {
          if (Array.isArray(value)) {
            return value.map((v) => `${key}: ${v}`);
          }
          return `${key}: ${value}`;
        })
    : [];

  return (
    <Alert variant="error" className={className}>
      <div>
        {message && <p className="font-semibold mb-2">{message}</p>}
        {errorList.length > 0 && (
          <ul className="list-disc list-inside space-y-1">
            {errorList.map((error, i) => (
              <li key={i} className="text-sm">
                {error}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Alert>
  );
}

// ============================================================
// FIELD ERROR COMPONENT
// ============================================================

interface FieldErrorProps {
  error?: string;
  className?: string;
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p
      className={cn(
        'mt-1.5 text-sm font-medium text-red-600 flex items-center gap-1',
        className
      )}
      role="alert"
    >
      <AlertCircle className="w-4 h-4" />
      {error}
    </p>
  );
}

// ============================================================
// INLINE ERROR COMPONENT
// ============================================================

interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-md bg-red-50 border border-red-200 text-red-900 text-sm flex items-center gap-2',
        className
      )}
      role="alert"
    >
      <AlertCircle className="w-4 h-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

// ============================================================
// SUCCESS MESSAGE COMPONENT
// ============================================================

interface SuccessMessageProps {
  message: string;
  className?: string;
}

export function SuccessMessage({ message, className }: SuccessMessageProps) {
  return (
    <Alert variant="success" className={className}>
      {message}
    </Alert>
  );
}

// ============================================================
// WARNING MESSAGE COMPONENT
// ============================================================

interface WarningMessageProps {
  title?: string;
  message: string;
  className?: string;
}

export function WarningMessage({
  title,
  message,
  className,
}: WarningMessageProps) {
  return (
    <Alert variant="warning" title={title} className={className}>
      {message}
    </Alert>
  );
}

export default {
  Alert,
  ErrorMessage,
  FieldError,
  InlineError,
  SuccessMessage,
  WarningMessage,
};
