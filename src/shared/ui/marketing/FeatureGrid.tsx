import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export interface FeatureGridProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
  headerClassName?: string;
  gridClassName?: string;
}

export function FeatureGrid({
  title,
  subtitle,
  children,
  columns = 3,
  className,
  headerClassName,
  gridClassName,
}: FeatureGridProps) {
  const columnClasses = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <section className={cn("relative w-full", className)}>
      <div className="container mx-auto px-4 py-16 md:py-20">
        {(title || subtitle) && (
          <div
            className={cn(
              "mx-auto mb-12 max-w-3xl text-center",
              headerClassName
            )}
          >
            {title && (
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}

        <div
          className={cn(
            "grid gap-6 md:gap-8",
            columnClasses[columns],
            gridClassName
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

export interface FeatureCardProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  iconClassName?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  className,
  iconClassName,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500",
            iconClassName
          )}
        >
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export default FeatureGrid;
