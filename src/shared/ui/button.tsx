import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kp-ai)] disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[var(--kp-ai)] text-white hover:bg-[var(--kp-ai)]/90",
        primary: "bg-[var(--kp-ai)] text-white hover:bg-[var(--kp-ai)]/90",
        "premium-primary":
          "bg-gradient-to-r from-kp-brand to-kp-brand-light text-white hover:shadow-glow-brand hover:brightness-110",
        positive:
          "bg-[var(--kp-positive)] text-white hover:bg-[var(--kp-positive)]/90",
        negative:
          "bg-[var(--kp-negative)] text-white hover:bg-[var(--kp-negative)]/90",
        success:
          "bg-[var(--kp-positive)] text-white hover:bg-[var(--kp-positive)]/90",
        danger:
          "bg-[var(--kp-negative)] text-white hover:bg-[var(--kp-negative)]/90",
        destructive:
          "bg-[var(--kp-negative)] text-white hover:bg-[var(--kp-negative)]/90",
        secondary:
          "border border-[var(--kp-border)] bg-[var(--kp-bg-secondary)] text-[var(--kp-text-primary)] hover:bg-[var(--kp-bg-tertiary)] hover:border-[var(--kp-border-dark)]",
        outline:
          "border border-[var(--kp-text-secondary)]/20 bg-transparent hover:bg-[var(--kp-bg-secondary)]",
        ghost: "hover:bg-[var(--kp-bg-secondary)]",
        tertiary: "hover:bg-[var(--kp-bg-secondary)]",
        glass:
          "bg-kp-bg-card backdrop-blur-glass border border-kp-border text-kp-text-primary hover:bg-kp-surface-elevated hover:border-kp-border-hover",
      },
      size: {
        default: "h-11 px-4 py-2 text-sm",
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-4 py-2 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  /** Alias for {@link loading}; kept for ButtonPremium compatibility. */
  isLoading?: boolean;
  asChild?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  glow?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "default",
      size = "default",
      loading = false,
      isLoading,
      asChild = false,
      icon,
      iconPosition = "left",
      fullWidth = false,
      glow = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const busy = isLoading ?? loading;

    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          glow && "shadow-glow-brand",
          fullWidth && "w-full",
          className,
        )}
        disabled={disabled || busy}
        {...props}
      >
        {asChild ? (
          children
        ) : busy ? (
          <>
            <span className="kp-spinner kp-spinner-sm" aria-hidden="true" />
            {children}
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <span className="flex-shrink-0">{icon}</span>
            )}
            {children}
            {icon && iconPosition === "right" && (
              <span className="flex-shrink-0">{icon}</span>
            )}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button };
