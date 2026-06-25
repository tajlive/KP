/**
 * Hero font configuration.
 *
 * display: "swap" is intentional: the hero H1 is the LCP element and we want
 * the fallback font to paint as early as possible. font-display:block would
 * keep the text invisible until the webfont arrives, increasing LCP.
 */
export const heroFontConfig = {
  subsets: ["latin"] as Array<"latin">,
  display: "swap" as const,
  variable: "--font-inter" as const,
  preload: true as const,
  adjustFontFallback: true as const,
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ] as string[],
};
