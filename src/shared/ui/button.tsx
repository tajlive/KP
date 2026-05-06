import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

export const buttonVariants = cva("kp-button", {
  variants: {
    variant: {
      primary: "kp-button-primary",
      secondary: "kp-button-secondary",
      ghost: "kp-button-ghost",
      danger: "kp-button-danger",
      success: "kp-button-success",
      outline: "kp-button-outline",
      destructive: "kp-button-danger",
      default: "kp-button-primary",
    },
    size: {
      sm: "kp-button-sm",
      md: "",
      lg: "kp-button-lg",
      icon: "kp-button-icon",
      default: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

import { Slot } from "@radix-ui/react-slot";

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      asChild = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const variantClass = variant ? `kp-button-${variant}` : "";
    const sizeClass =
      size && size !== "md" && size !== "default" ? `kp-button-${size}` : "";

    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={`kp-button ${variantClass} ${sizeClass} ${className}`.trim()}
        disabled={disabled || loading}
        {...props}
      >
        {loading && !asChild ? (
          <>
            <span className="kp-spinner kp-spinner-sm" aria-hidden="true" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button };
