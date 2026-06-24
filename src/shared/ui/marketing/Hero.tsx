import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export interface HeroProps {
  namespace: string;
  children?: ReactNode;
  className?: string;
}

export function Hero({
  namespace: _namespace,
  children,
  className,
}: HeroProps) {
  // `_namespace` is reserved for namespace-aware translation keys in the full implementation.
  return (
    <section className={cn("relative w-full", className)}>
      <div className="container mx-auto px-4 py-16 md:py-24">{children}</div>
    </section>
  );
}

export default Hero;
