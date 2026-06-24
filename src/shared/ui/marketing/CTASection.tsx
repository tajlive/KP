import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export interface CTASectionProps {
  namespace: string;
  children?: ReactNode;
  className?: string;
}

export function CTASection({ children, className }: CTASectionProps) {
  return (
    <section className={cn("relative w-full", className)}>
      <div className="container mx-auto px-4 py-12 md:py-20">{children}</div>
    </section>
  );
}

export default CTASection;
