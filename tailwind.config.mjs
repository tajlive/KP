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
        // Klarpakke Nordic Trust Design System
        kp: {
          // Landing page / light theme
          'bg-primary': '#FFFFFF',
          'bg-secondary': '#F7F8FA',
          'bg-tertiary': '#EEF1F6',
          'text-primary': '#1A1D26',
          'text-secondary': '#5E6478',
          'text-tertiary': '#8E94A7',
          'border': '#E2E5EC',
          // Brand colors
          'brand': '#0052FF',
          'brand-light': '#E8F0FE',
          'brand-dark': '#003BB5',
          'brand-hover': '#0047E0',
          // Dashboard / dark theme
          'dark-bg': '#0F1118',
          'dark-surface': '#171923',
          'dark-border': '#2A2D3A',
          'dark-accent': '#6FA3FF',
          // Status colors
          'success': '#0B9E5A',
          'success-light': '#E6F7EF',
          'warning': '#E5850A',
          'warning-light': '#FFF4E5',
          'danger': '#D63B3B',
          'danger-light': '#FDE8E8',
        },
        // Legacy brand mapping (for compatibility)
        brand: {
          50: '#E8F0FE',
          100: '#D4E2FD',
          500: '#0052FF',
          600: '#0047E0',
          700: '#003BB5',
          900: '#002680',
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
