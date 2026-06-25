import { Suspense, type ReactNode } from "react";
import {
  LocaleMarketingShellFallback,
  LocaleMarketingShellInner,
} from "@/shared/layout/MarketingShellClient";

export function LocaleMarketingShell({
  marketingNav,
  children,
}: {
  marketingNav: ReactNode;
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <LocaleMarketingShellFallback marketingNav={marketingNav}>{children}</LocaleMarketingShellFallback>
      }
    >
      <LocaleMarketingShellInner marketingNav={marketingNav}>{children}</LocaleMarketingShellInner>
    </Suspense>
  );
}
