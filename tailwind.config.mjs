/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Coinbase CDS-inspired Design System (Dark First)
        kp: {
          // Dark theme (default) - Coinbase-inspired
          'bg-primary': '#0a0b0d',      // Main background
          'bg-secondary': '#161719',     // Card/surface background
          'bg-tertiary': '#1a1c24',      // Elevated surfaces
          'bg-elevated': '#1f2128',      // Inputs, hover states
          'text-primary': '#f1f5f9',     // Primary text (white-ish)
          'text-secondary': '#9ca3af',   // Secondary text (gray-400)
          'text-tertiary': '#6b7280',    // Tertiary/muted text
          'border': 'rgba(255,255,255,0.08)', // Subtle borders
          'border-strong': 'rgba(255,255,255,0.15)', // Stronger borders
          // Brand colors - Coinbase Blue
          'brand': '#0052FF',
          'brand-light': '#3d7aff',
          'brand-dark': '#0047E0',
          'brand-hover': '#0047E0',
          'brand-subtle': 'rgba(0,82,255,0.15)',
          // Dark theme specific
          'dark-bg': '#0a0b0d',
          'dark-surface': '#161719',
          'dark-border': 'rgba(255,255,255,0.08)',
          'dark-accent': '#6FA3FF',
          // Status colors (Coinbase style)
          'success': '#05B169',
          'success-light': 'rgba(5,177,105,0.15)',
          'warning': '#F59E0B',
          'warning-light': 'rgba(245,158,11,0.15)',
          'danger': '#EF4444',
          'danger-light': 'rgba(239,68,68,0.15)',
          // Legacy light theme support
          'light-bg': '#FFFFFF',
          'light-surface': '#F7F8FA',
          'light-border': '#E2E5EC',
        },
        // Brand color scale (Coinbase Blue #0052FF)
        brand: {
          50: '#E8F0FE',
          100: '#D4E2FD',
          200: '#A8C5FB',
          300: '#7DA8F9',
          400: '#528BF7',
          500: '#0052FF',  // Primary brand
          600: '#0047E0',
          700: '#003BB5',
          800: '#002F8F',
          900: '#002680',
        },
        // Coinbase dark surface palette
        surface: {
          'primary': '#0a0b0d',
          'secondary': '#161719',
          'tertiary': '#1a1c24',
          'elevated': '#1f2128',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['var(--font-instrument-serif)', 'Instrument Serif', 'Georgia', 'serif'],
        display: ['var(--font-instrument-serif)', 'Instrument Serif', 'Georgia', 'serif'],
      },
      fontSize: {
        'body': ['20px', { lineHeight: '1.6' }],
        'body-sm': ['18px', { lineHeight: '1.5' }],
        'body-lg': ['24px', { lineHeight: '1.7' }],
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.08)',
        'floating': '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'button': '12px',
        'card': '16px',
        'card-lg': '20px',
        'badge': '20px',
        'input': '10px',
        'logo': '10px',
        'avatar': '8px',
      },
    },
  },
  plugins: [],
};

export default config;
