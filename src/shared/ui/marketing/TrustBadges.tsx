import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export interface TrustBadgesProps {
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  innerClassName?: string;
}

export function TrustBadges({
  title,
  children,
  className,
  innerClassName,
}: TrustBadgesProps) {
  return (
    <section className={cn("relative w-full bg-muted/50", className)}>
      <div
        className={cn(
          "container mx-auto px-4 py-10 md:py-14",
          innerClassName
        )}
      >
        {title && (
          <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
            {title}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {children}
        </div>
      </div>
    </section>
  );
}

export interface TrustBadgeProps {
  icon?: ReactNode;
  label: ReactNode;
  className?: string;
}

export function TrustBadge({ icon, label, className }: TrustBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className
      )}
    >
      {icon && <span className="text-brand-500">{icon}</span>}
      <span>{label}</span>
    </div>
  );
}

export default TrustBadges;
