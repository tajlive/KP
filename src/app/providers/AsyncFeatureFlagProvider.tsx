import { getFlagsAsync } from "@/lib/flags";
import { FeatureFlagProvider } from "@/lib/feature-flags";
import type { ReactNode } from "react";

export async function AsyncFeatureFlagProvider({
  children,
}: {
  children: ReactNode;
}) {
  const flags = await getFlagsAsync();
  return (
    <FeatureFlagProvider initialFlags={flags}>
      {children}
    </FeatureFlagProvider>
  );
}
