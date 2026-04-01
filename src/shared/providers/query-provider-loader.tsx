"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface Props {
  children: ReactNode;
}

/**
 * Loads QueryProvider after mount to avoid "Cannot read properties of undefined (reading 'call')"
 * which can occur when @tanstack/react-query is loaded during initial bundle evaluation.
 */
export function QueryProviderLoader({ children }: Props) {
  const [Provider, setProvider] = useState<
    ((props: { children: ReactNode }) => React.ReactElement) | null
  >(null);
  const [err, setErr] = useState<unknown>(null);

  useEffect(() => {
    import("@/shared/providers/query-provider")
      .then((mod) => setProvider(() => mod.QueryProvider))
      .catch(setErr);
  }, []);

  if (err) {
    console.error("[QueryProviderLoader] Failed to load QueryProvider:", err);
    return <>{children}</>;
  }
  if (!Provider) {
    return <>{children}</>;
  }
  return <Provider>{children}</Provider>;
}
