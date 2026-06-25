import { Outfit } from "next/font/google";

/**
 * Hero font instance. Must be created at module scope with an inline literal
 * config to satisfy Next.js font-loader requirements.
 *
 * display: "swap" is intentional: the hero H1 is the LCP element and we want
 * the fallback font to paint as early as possible.
 */
export const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
  adjustFontFallback: true,
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ],
});
