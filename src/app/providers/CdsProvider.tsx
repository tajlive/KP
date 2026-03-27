"use client";

import { ReactNode, useMemo } from "react";
import { MediaQueryProvider, ThemeProvider } from "@coinbase/cds-web/system";
import { defaultTheme } from "@coinbase/cds-web/themes/defaultTheme";

export function CdsProvider({ children }: { children: ReactNode }) {
  const colorScheme = useMemo<"light" | "dark">(() => "light", []);

  return (
    <MediaQueryProvider>
      <ThemeProvider theme={defaultTheme} activeColorScheme={colorScheme}>
        {children}
      </ThemeProvider>
    </MediaQueryProvider>
  );
}
