import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export type CTASectionVariant = "default" | "brand" | "dark" | "pricing" | "light";

export interface CTASectionProps {
  title: ReactNode;
  description?: ReactNode;
  primaryCta?: ReactNode;
  secondaryCta?: ReactNode;
  footer?: ReactNode;
  variant?: CTASectionVariant;
  className?: string;
  innerClassName?: string;
  children?: ReactNode;
}

const variantStyles: Record<CTASectionVariant, string> = {
  default: "bg-brand-500 text-white",
  brand: "bg-brand-500 text-white",
  dark: "bg-slate-900 text-white",
  pricing: "bg-slate-900 text-white",
  light: "bg-slate-50 text-slate-900",
};

export function CTASection({
  title,
  description,
  primaryCta,
  secondaryCta,
  footer,
  variant = "default",
  className,
  innerClassName,
  children,
}: CTASectionProps) {
  return (
    <section
      className={cn("relative w-full", variantStyles[variant], className)}
    >
      <div
        className={cn(
          "container mx-auto px-4 py-16 md:py-20 lg:py-24",
          innerClassName
        )}
      >
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            {title}
          </h2>

          {description && (
            <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">
              {description}
            </p>
          )}

          {(primaryCta || secondaryCta) && (
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {primaryCta}
              {secondaryCta}
            </div>
          )}

          {footer && <div className="mt-6 text-sm opacity-80">{footer}</div>}
        </div>
      </div>

      {children}
    </section>
  );
}

export default CTASection;
