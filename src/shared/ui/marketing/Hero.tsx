import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export type HeroBackground = "default" | "brand" | "dark" | "gradient" | "light";

export interface HeroProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  ctas?: ReactNode;
  trustBadges?: ReactNode;
  footer?: ReactNode;
  background?: HeroBackground;
  className?: string;
  innerClassName?: string;
  children?: ReactNode;
}

const backgroundStyles: Record<HeroBackground, string> = {
  default: "bg-background",
  brand: "bg-brand-500 text-white",
  dark: "bg-slate-900 text-white",
  gradient: "bg-gradient-to-br from-brand-500 to-brand-700 text-white",
  light: "bg-slate-50",
};

export function Hero({
  title,
  subtitle,
  badge,
  ctas,
  trustBadges,
  footer,
  background = "default",
  className,
  innerClassName,
  children,
}: HeroProps) {
  return (
    <section
      className={cn(
        "relative w-full overflow-hidden",
        backgroundStyles[background],
        className
      )}
    >
      <div
        className={cn(
          "container mx-auto px-4 py-16 md:py-24 lg:py-32",
          innerClassName
        )}
      >
        <div className="mx-auto max-w-4xl text-center">
          {badge && <div className="mb-6">{badge}</div>}

          <h1 className="text-4xl font-extrabold tracking-tight text-current md:text-5xl lg:text-6xl">
            {title}
          </h1>

          {subtitle && (
            <p className="mx-auto mt-6 max-w-2xl text-lg text-current/80 md:text-xl">
              {subtitle}
            </p>
          )}

          {ctas && (
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {ctas}
            </div>
          )}

          {trustBadges && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-current/70">
              {trustBadges}
            </div>
          )}

          {footer && <div className="mt-8">{footer}</div>}
        </div>
      </div>

      {children}
    </section>
  );
}

export default Hero;
