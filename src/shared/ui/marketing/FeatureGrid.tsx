import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export interface FeatureGridProps {
  namespace: string;
  children?: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function FeatureGrid({
  children,
  className,
  columns = 3,
}: FeatureGridProps) {
  const columnClasses = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <section className={cn("relative w-full", className)}>
      <div
        className={cn(
          "container mx-auto px-4 grid gap-6 md:gap-8",
          columnClasses[columns]
        )}
      >
        {children}
      </div>
    </section>
  );
}

export default FeatureGrid;
