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
        // PREMIUM 2026 DARK DESIGN SYSTEM
        kp: {
          // Background hierarchy - deeper, richer dark
          'bg-primary': '#050507',        // Deepest background
          'bg-secondary': '#0a0a0f',      // Main surface
          'bg-tertiary': '#0f0f14',       // Elevated cards
          'bg-elevated': '#15151c',       // Inputs, hover
          'bg-card': 'rgba(15, 15, 20, 0.6)', // Glass card base
          
          // Text hierarchy - improved contrast
          'text-primary': '#fafafa',      // Primary text
          'text-secondary': '#a1a1aa',    // Secondary text
          'text-tertiary': '#71717a',     // Muted text
          'text-muted': '#52525b',        // Subtle text
          
          // Borders - refined glass effect
          'border': 'rgba(255, 255, 255, 0.06)',
          'border-hover': 'rgba(255, 255, 255, 0.12)',
          'border-strong': 'rgba(255, 255, 255, 0.18)',
          
          // Premium accent - Coinbase blue with glow
          'brand': '#0052FF',
          'brand-light': '#3d7aff',
          'brand-dark': '#0047E0',
          'brand-hover': '#0039c7',
          'brand-glow': 'rgba(0, 82, 255, 0.4)',
          'brand-subtle': 'rgba(0, 82, 255, 0.1)',
          
          // Surface tints for depth
          'surface': '#0a0a0f',
          'surface-elevated': '#12121a',
          'surface-highlight': 'rgba(255, 255, 255, 0.03)',
          
          // Status colors - more refined
          'success': '#10b981',
          'success-light': 'rgba(16, 185, 129, 0.15)',
          'success-glow': 'rgba(16, 185, 129, 0.3)',
          'warning': '#f59e0b',
          'warning-light': 'rgba(245, 158, 11, 0.15)',
          'danger': '#ef4444',
          'danger-light': 'rgba(239, 68, 68, 0.15)',
          'danger-glow': 'rgba(239, 68, 68, 0.3)',
          
          // Gradient accents
          'gradient-start': '#0052FF',
          'gradient-end': '#7c3aed',
        },
        
        // Brand scale
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
        
        // Premium surface palette
        surface: {
          'deepest': '#050507',
          'primary': '#0a0a0f',
          'secondary': '#0f0f14',
          'tertiary': '#15151c',
          'elevated': '#1c1c24',
          'glass': 'rgba(15, 15, 20, 0.6)',
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
