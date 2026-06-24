import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export interface CTASectionProps {
  namespace: string;
  children?: ReactNode;
  className?: string;
}

export function CTASection({
  namespace: _namespace,
  children,
  className,
}: CTASectionProps) {
  // `_namespace` is reserved for namespace-aware translation keys in the full implementation.
  return (
    <section className={cn("relative w-full", className)}>
      <div className="container mx-auto px-4 py-12 md:py-20">{children}</div>
    </section>
  );
}

export default CTASection;
