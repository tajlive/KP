import { Suspense, type ReactNode } from "react";
import type { NavigationData } from "@/shared/layout/NavigationServer";
import {
  LocaleMarketingShellFallback,
  LocaleMarketingShellInner,
} from "@/shared/layout/MarketingShellClient";

export function LocaleMarketingShell({
  navData,
  children,
}: {
  navData: NavigationData;
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <LocaleMarketingShellFallback navData={navData}>{children}</LocaleMarketingShellFallback>
      }
    >
      <LocaleMarketingShellInner navData={navData}>{children}</LocaleMarketingShellInner>
    </Suspense>
  );
}
