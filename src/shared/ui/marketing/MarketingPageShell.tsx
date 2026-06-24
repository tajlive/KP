import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export type MarketingNamespace =
  | "landing"
  | "pricing"
  | "about"
  | "contact"
  | "calculator"
  | "help";

export interface MarketingPageShellProps {
  namespace: MarketingNamespace;
  children: ReactNode;
  className?: string;
  withCTA?: boolean;
}

export function MarketingPageShell({
  children,
  className,
}: MarketingPageShellProps) {
  return (
    <main className={cn("min-h-screen bg-background", className)}>
      {children}
    </main>
  );
}

export default MarketingPageShell;
