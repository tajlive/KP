import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export interface TrustBadgesProps {
  namespace: string;
  children?: ReactNode;
  className?: string;
}

export function TrustBadges({ children, className }: TrustBadgesProps) {
  return (
    <section className={cn("relative w-full", className)}>
      <div className="container mx-auto px-4 py-8 md:py-12">{children}</div>
    </section>
  );
}

export default TrustBadges;
