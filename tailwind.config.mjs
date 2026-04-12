/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    // App Router (Next.js 15)
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    // Feature-based architecture
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    // Shared components
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
    // Legacy components (migreres til features)
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    // Utilities og hooks
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    // Styles
    './src/styles/**/*.css',
  ],
  theme: {
    extend: {
      colors: {
        // SEMANTIC DESIGN SYSTEM - Koblet til CSS-variabler
        kp: {
          // Background hierarchy
          'bg-primary': 'var(--kp-bg-primary)',
          'bg-secondary': 'var(--kp-bg-secondary)',
          'bg-tertiary': 'var(--kp-bg-tertiary)',
          'bg-elevated': 'var(--kp-bg-elevated)',
          'bg-card': 'var(--kp-bg-card)',
          'bg-hover': 'var(--kp-bg-hover)',
          'bg-active': 'var(--kp-bg-active)',
          
          // Text hierarchy - WCAG AA compliant
          'text-primary': 'var(--kp-text-primary)',
          'text-secondary': 'var(--kp-text-secondary)',
          'text-tertiary': 'var(--kp-text-tertiary)',
          'text-muted': 'var(--kp-text-muted)',
          
          // Borders
          'border': 'var(--kp-border)',
          'border-light': 'var(--kp-border-light)',
          'border-dark': 'var(--kp-border-dark)',
          'border-brand': 'var(--kp-border-brand)',
          
          // Premium accent
          'brand': 'var(--kp-brand)',
          'brand-light': 'var(--kp-brand-light)',
          'brand-dark': 'var(--kp-brand-dark)',
          'brand-hover': 'var(--kp-brand-hover)',
          'brand-glow': 'var(--kp-brand-glow)',
          'brand-subtle': 'var(--kp-brand-subtle)',
          
          // Surface
          'surface': 'var(--kp-surface)',
          'surface-elevated': 'var(--kp-surface-elevated)',
          'surface-highlight': 'var(--kp-surface-highlight)',
          
          // Input
          'input-bg': 'var(--kp-input-bg)',
          'input-border': 'var(--kp-input-border)',
          'input-border-focus': 'var(--kp-input-border-focus)',
          'input-text': 'var(--kp-input-text)',
          'input-placeholder': 'var(--kp-input-placeholder)',
          
          // Status
          'success': 'var(--kp-success)',
          'success-bg': 'var(--kp-success-bg)',
          'warning': 'var(--kp-warning)',
          'warning-bg': 'var(--kp-warning-bg)',
          'danger': 'var(--kp-danger)',
          'danger-bg': 'var(--kp-danger-bg)',
          
          // Navigation
          'nav-bg': 'var(--kp-nav-bg)',
          'nav-text': 'var(--kp-nav-text)',
          'nav-text-muted': 'var(--kp-nav-text-muted)',
        },
        
        // Brand scale (statiske for gradients)
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0052FF',
          600: '#0047E0',
          700: '#0039c7',
          800: '#002fa3',
          900: '#002680',
        },
      },
      
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['var(--font-instrument-serif)', 'Instrument Serif', 'Georgia', 'serif'],
        display: ['var(--font-instrument-serif)', 'Instrument Serif', 'Georgia', 'serif'],
      },
      
      fontSize: {
        'display': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-sm': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'heading': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'heading-sm': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'title': ['1.5rem', { lineHeight: '1.3' }],
        'title-sm': ['1.25rem', { lineHeight: '1.4' }],
        'body': ['1.125rem', { lineHeight: '1.6' }],
        'body-sm': ['1rem', { lineHeight: '1.6' }],
      },
      
      borderRadius: {
        'button': '12px',
        'card': '16px',
        'card-lg': '20px',
        'card-xl': '24px',
        'badge': '9999px',
        'input': '10px',
      },
      
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass-hover': '0 8px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glow-brand': '0 0 40px rgba(0, 82, 255, 0.3)',
        'glow-success': '0 0 30px rgba(16, 185, 129, 0.25)',
        'glow-danger': '0 0 30px rgba(239, 68, 68, 0.25)',
        'floating': '0 20px 50px rgba(0, 0, 0, 0.3)',
      },
      
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #0052FF 0%, #7c3aed 50%, #0052FF 100%)',
        'surface-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
      },
      
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      
      backdropBlur: {
        'glass': '20px',
      },
    },
  },
  plugins: [],
};

export default config;
