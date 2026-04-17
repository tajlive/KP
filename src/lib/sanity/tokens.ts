/**
 * Server-side design tokens fetcher
 * Eliminates FOUC by injecting CSS in <head> before HTML reaches the client
 */

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

// Default tokens CSS (always safe fallback)
export const DEFAULT_TOKENS_CSS = `
:root {
  --kp-brand: #0052FF;
  --kp-brand-hover: #0047E0;
  --kp-brand-light: #dbeafe;
  --kp-success: #22c55e;
  --kp-warning: #f59e0b;
  --kp-error: #ef4444;
  --kp-info: #3b82f6;
  --kp-bg-primary: #0a0b0d;
  --kp-bg-secondary: #161719;
  --kp-bg-elevated: #1a1c24;
  --kp-text-primary: #f1f5f9;
  --kp-text-secondary: #94a3b8;
  --kp-border: rgba(255,255,255,0.08);
  --kp-font-family: Inter, system-ui, -apple-system, sans-serif;
  --kp-font-size-base: 16px;
  --kp-spacing-unit: 4px;
  --kp-radius-button: 12px;
  --kp-radius-card: 16px;
  --kp-radius-input: 10px;
  --kp-shadow-card: 0 4px 30px rgba(0, 0, 0, 0.1);
  --kp-shadow-elevated: 0 20px 50px rgba(0, 0, 0, 0.3);
  --kp-shadow-glow: 0 0 40px rgba(0, 82, 255, 0.3);
}
`;

const TOKENS_QUERY = `*[_type == "designTokens" && isActive == true][0] {
  brandColors,
  semanticColors,
  darkMode,
  typography,
  spacing,
  borderRadius,
  shadows,
  isActive,
  lastUpdated
}`;

function generateCSS(tokens: Record<string, any>): string {
  const { brandColors, semanticColors, darkMode, typography, spacing, borderRadius, shadows } = tokens;

  return `
:root {
  --kp-brand: ${brandColors?.primary ?? '#0052FF'};
  --kp-brand-hover: ${brandColors?.primaryHover ?? '#0047E0'};
  --kp-brand-light: ${brandColors?.primaryLight ?? '#dbeafe'};
  --kp-success: ${semanticColors?.success ?? '#22c55e'};
  --kp-warning: ${semanticColors?.warning ?? '#f59e0b'};
  --kp-error: ${semanticColors?.error ?? '#ef4444'};
  --kp-info: ${semanticColors?.info ?? '#3b82f6'};
  --kp-bg-primary: ${darkMode?.bgPrimary ?? '#0a0b0d'};
  --kp-bg-secondary: ${darkMode?.bgSecondary ?? '#161719'};
  --kp-bg-elevated: ${darkMode?.bgElevated ?? '#1a1c24'};
  --kp-text-primary: ${darkMode?.textPrimary ?? '#f1f5f9'};
  --kp-text-secondary: ${darkMode?.textSecondary ?? '#94a3b8'};
  --kp-border: ${darkMode?.border ?? 'rgba(255,255,255,0.08)'};
  --kp-font-family: ${typography?.fontFamily ?? 'Inter'}, system-ui, -apple-system, sans-serif;
  --kp-font-size-base: ${typography?.baseFontSize ?? 16}px;
  --kp-spacing-unit: ${spacing?.unit ?? 4}px;
  --kp-radius-button: ${borderRadius?.button ?? 12}px;
  --kp-radius-card: ${borderRadius?.card ?? 16}px;
  --kp-radius-input: ${borderRadius?.input ?? 10}px;
  --kp-shadow-card: ${shadows?.card ?? '0 4px 30px rgba(0, 0, 0, 0.1)'};
  --kp-shadow-elevated: ${shadows?.elevated ?? '0 20px 50px rgba(0, 0, 0, 0.3)'};
  --kp-shadow-glow: ${shadows?.glow ?? '0 0 40px rgba(0, 82, 255, 0.3)'};
}
`;
}

export async function getSanityTokensCSS(): Promise<string> {
  if (!projectId) {
    return DEFAULT_TOKENS_CSS;
  }

  try {
    const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-04-15';
    const encodedQuery = encodeURIComponent(TOKENS_QUERY);
    const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodedQuery}`;
    const res = await fetch(url, { 
      next: { 
        revalidate: 60,
        tags: ['sanity', 'sanity:designTokens']
      } 
    });

    if (!res.ok) {
      return DEFAULT_TOKENS_CSS;
    }

    const json = await res.json();
    const tokens = json.result as Record<string, any> | null;

    if (tokens && tokens.isActive) {
      return generateCSS(tokens);
    }
  } catch (err) {
    console.warn('[Design Tokens] Server-side fetch failed:', err);
  }

  return DEFAULT_TOKENS_CSS;
}
