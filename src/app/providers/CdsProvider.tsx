"use client";

import { ReactNode, useMemo } from "react";
import { useTheme } from "next-themes";
import { MediaQueryProvider, ThemeProvider } from "@coinbase/cds-web/system";
import { defaultTheme } from "@coinbase/cds-web/themes/defaultTheme";

export function CdsProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const colorScheme = useMemo<"light" | "dark">(
    () => (resolvedTheme === "dark" ? "dark" : "light"),
    [resolvedTheme],
  );

  return (
    <MediaQueryProvider>
      <ThemeProvider theme={defaultTheme} activeColorScheme={colorScheme}>
        {children}
      </ThemeProvider>
    </MediaQueryProvider>
  );
}
