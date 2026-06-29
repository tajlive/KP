import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import React, { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonPremiumProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  glow?: boolean;
  asChild?: boolean;
}

const ButtonPremium = forwardRef<HTMLButtonElement, ButtonPremiumProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      glow = false,
      disabled,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      // Base styles
      'relative inline-flex items-center justify-center gap-2',
      'font-semibold tracking-tight',
      'rounded-button transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-kp-brand/50 focus:ring-offset-2 focus:ring-offset-kp-bg-primary',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none',
      'hover:scale-[1.02] active:scale-[0.98]',
      
      // Size variants
      {
        'px-4 py-2 text-sm': size === 'sm',
        'px-6 py-3 text-base': size === 'md',
        'px-8 py-4 text-lg': size === 'lg',
      },
      
      // Variant styles
      {
        // Primary: Brand blue with gradient and glow
        'bg-gradient-to-r from-kp-brand to-kp-brand-light text-white': variant === 'primary',
        'hover:shadow-glow-brand hover:brightness-110': variant === 'primary' && !disabled,
        
        // Secondary: Outlined with subtle background
        'bg-transparent border-2 border-kp-border-strong text-kp-text-primary': variant === 'secondary',
        'hover:bg-kp-surface-highlight hover:border-kp-brand/30': variant === 'secondary' && !disabled,
        
        // Ghost: Minimal, text only with hover
        'bg-transparent text-kp-text-secondary': variant === 'ghost',
        'hover:text-kp-text-primary hover:bg-kp-surface-highlight': variant === 'ghost' && !disabled,
        
        // Glass: Glassmorphism effect
        'bg-kp-bg-card backdrop-blur-glass border border-kp-border text-kp-text-primary': variant === 'glass',
        'hover:bg-kp-surface-elevated hover:border-kp-border-hover': variant === 'glass' && !disabled,
        
        // Danger: Red for destructive actions
        'bg-kp-danger text-white': variant === 'danger',
        'hover:shadow-glow-danger hover:brightness-110': variant === 'danger' && !disabled,
      },
      
      // Glow effect
      glow && 'shadow-glow-brand',
      
      // Full width
      fullWidth && 'w-full',
      
      className
    );

    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={baseClasses}
        disabled={asChild ? undefined : disabled || isLoading}
        {...props}
      >
        {/* Loading spinner */}
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* Icon left */}
        {icon && iconPosition === 'left' && !isLoading && (
          <span className="flex-shrink-0">{icon}</span>
        )}

        {/* Button text */}
        <span>{children}</span>

        {/* Icon right */}
        {icon && iconPosition === 'right' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </Comp>
    );
  }
);

ButtonPremium.displayName = 'ButtonPremium';

export { ButtonPremium };
export default ButtonPremium;
