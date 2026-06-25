/**
 * Critical CSS for the above-the-fold hero headline.
 *
 * Inlining these rules lets the browser paint the LCP element (hero H1) before
 * the full Tailwind stylesheet has finished downloading and parsing.
 */
export function getCriticalHeroCss(): string {
  return `
    .hero-headline {
      font-family: var(--font-inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      font-size: clamp(3rem, 7vw, 7rem);
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.025em;
      color: var(--kp-text-primary, #fafafa);
      margin-bottom: 1.5rem;
    }
    .hero-headline span {
      display: block;
      margin-top: 0.5rem;
      background: linear-gradient(90deg, var(--kp-brand, #0052ff), var(--kp-brand-light, #3d7aff), #c084fc);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  `.replace(/\s+/g, " ").trim();
}
