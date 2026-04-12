/**
 * DESIGN TOKENS API
 * 
 * Henter design tokens fra Sanity CMS og returnerer som JSON eller CSS.
 * Brukes av Tailwind v4 for dynamisk theming.
 */

import { NextRequest, NextResponse } from 'next/server';

// Cache i 60 sekunder (maksimalt for Vercel Edge)
export const revalidate = 60;

// Grok query for design tokens
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

// Default/fallback tokens (hvis Sanity ikke er konfigurert eller inaktivt)
const DEFAULT_TOKENS = {
  brandColors: {
    primary: '#0052FF',
    primaryHover: '#0047E0',
    primaryLight: '#dbeafe',
  },
  semanticColors: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  darkMode: {
    bgPrimary: '#0a0b0d',
    bgSecondary: '#161719',
    bgElevated: '#1a1c24',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: 'rgba(255,255,255,0.08)',
  },
  typography: {
    fontFamily: 'Inter',
    baseFontSize: 16,
  },
  spacing: {
    unit: 4,
    scale: 1,
  },
  borderRadius: {
    button: 12,
    card: 16,
    input: 10,
  },
  shadows: {
    card: '0 4px 30px rgba(0, 0, 0, 0.1)',
    elevated: '0 20px 50px rgba(0, 0, 0, 0.3)',
    glow: '0 0 40px rgba(0, 82, 255, 0.3)',
  },
  isActive: false,
  source: 'default',
};

interface TokensResponse {
  tokens: typeof DEFAULT_TOKENS;
  css: string;
  lastUpdated: string | null;
  source: 'sanity' | 'default';
}

function generateCSS(tokens: typeof DEFAULT_TOKENS): string {
  const { brandColors, semanticColors, darkMode, typography, spacing, borderRadius, shadows } = tokens;
  
  return `
/* ═══════════════════════════════════════════════════════════════
   GENERATED DESIGN TOKENS - ${new Date().toISOString()}
   Source: ${tokens.isActive ? 'Sanity CMS' : 'Fallback Defaults'}
   ═══════════════════════════════════════════════════════════════ */

:root {
  /* Brand Colors */
  --kp-brand: ${brandColors.primary};
  --kp-brand-hover: ${brandColors.primaryHover};
  --kp-brand-light: ${brandColors.primaryLight};
  
  /* Semantic Colors */
  --kp-success: ${semanticColors.success};
  --kp-warning: ${semanticColors.warning};
  --kp-error: ${semanticColors.error};
  --kp-info: ${semanticColors.info};
  
  /* Dark Mode - Backgrounds */
  --kp-bg-primary: ${darkMode.bgPrimary};
  --kp-bg-secondary: ${darkMode.bgSecondary};
  --kp-bg-elevated: ${darkMode.bgElevated};
  
  /* Dark Mode - Text */
  --kp-text-primary: ${darkMode.textPrimary};
  --kp-text-secondary: ${darkMode.textSecondary};
  
  /* Dark Mode - Borders */
  --kp-border: ${darkMode.border};
  
  /* Typography */
  --kp-font-family: ${typography.fontFamily}, system-ui, -apple-system, sans-serif;
  --kp-font-size-base: ${typography.baseFontSize}px;
  
  /* Spacing */
  --kp-spacing-unit: ${spacing.unit}px;
  
  /* Border Radius */
  --kp-radius-button: ${borderRadius.button}px;
  --kp-radius-card: ${borderRadius.card}px;
  --kp-radius-input: ${borderRadius.input}px;
  
  /* Shadows */
  --kp-shadow-card: ${shadows.card};
  --kp-shadow-elevated: ${shadows.elevated};
  --kp-shadow-glow: ${shadows.glow};
}
`;
}

// Lazy-load Sanity client for å unngå build-feil når PROJECT_ID mangler
async function getSanityClient() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) return null;
  
  const { createClient } = await import('@sanity/client');
  return createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    apiVersion: '2024-04-11',
    useCdn: true,
    perspective: 'published',
  });
}

export async function GET(request: NextRequest): Promise<NextResponse<TokensResponse | { error: string }>> {
  try {
    // Sjekk format (json eller css)
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    
    // Hent tokens fra Sanity
    let tokens = DEFAULT_TOKENS;
    let source: 'sanity' | 'default' = 'default';
    let lastUpdated = null;
    
    // Lazy-load Sanity client
    const sanityClient = await getSanityClient();
    
    if (sanityClient) {
      try {
        const sanityTokens = await sanityClient.fetch(TOKENS_QUERY);
        
        if (sanityTokens && sanityTokens.isActive) {
          tokens = {
            brandColors: sanityTokens.brandColors || DEFAULT_TOKENS.brandColors,
            semanticColors: sanityTokens.semanticColors || DEFAULT_TOKENS.semanticColors,
            darkMode: sanityTokens.darkMode || DEFAULT_TOKENS.darkMode,
            typography: sanityTokens.typography || DEFAULT_TOKENS.typography,
            spacing: sanityTokens.spacing || DEFAULT_TOKENS.spacing,
            borderRadius: sanityTokens.borderRadius || DEFAULT_TOKENS.borderRadius,
            shadows: sanityTokens.shadows || DEFAULT_TOKENS.shadows,
            isActive: true,
            source: 'sanity',
          };
          source = 'sanity';
          lastUpdated = sanityTokens.lastUpdated;
        }
      } catch (sanityError) {
        console.warn('[Design Tokens] Sanity fetch failed, using defaults:', sanityError);
      }
    }
    
    // Returner CSS direkte hvis format=css
    if (format === 'css') {
      const css = generateCSS(tokens);
      return new NextResponse(css, {
        headers: {
          'Content-Type': 'text/css',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      });
    }
    
    // Returner JSON
    return NextResponse.json({
      tokens,
      css: generateCSS(tokens),
      lastUpdated,
      source,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
    
  } catch (error) {
    console.error('[Design Tokens API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch design tokens' },
      { status: 500 }
    );
  }
}
