"use client";

import { useEffect } from "react";
import { initGlobalErrorHandling } from "@/lib/error-reporting";

/**
 * MarketingProviders - Minimal providers for landing/marketing pages
 * 
 * KEY DIFFERENCES from ClientSideProviders:
 * - NO ChatWidgetLoader (not needed for anon visitors)
 * - NO PWALoader (defer to dashboard)
 * - Only global error handling
 * 
 * This reduces initial JS bundle significantly for landing pages.
 */

function ErrorHandlerInit() {
  useEffect(() => {
    initGlobalErrorHandling();
  }, []);
  return null;
}

export function MarketingProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ErrorHandlerInit />
      {children}
    </>
  );
}
