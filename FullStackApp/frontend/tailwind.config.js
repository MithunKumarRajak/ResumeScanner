/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f9f9f9', 100: '#f3f3f3', 200: '#e5e5e5', 300: '#d4d4d4', 
          400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040', 
          800: '#262626', 900: '#171717', 950: '#0a0a0a',
        },
        indigo: {
          50: '#ffffff', 100: '#f3f3f3', 200: '#e5e5e5', 300: '#d4d4d4',
          400: '#a3a3a3', 500: '#ffffff', 600: '#e5e5e5', 700: '#a3a3a3',
          800: '#737373', 900: '#404040', 950: '#171717',
        },
        violet: {
          50: '#ffffff', 100: '#f3f3f3', 200: '#e5e5e5', 300: '#d4d4d4',
          400: '#a3a3a3', 500: '#ffffff', 600: '#e5e5e5', 700: '#a3a3a3',
          800: '#737373', 900: '#404040', 950: '#171717',
        },
        emerald: {
          50: '#ffffff', 100: '#f3f3f3', 200: '#e5e5e5', 300: '#d4d4d4',
          400: '#ffffff', 500: '#ffffff', 600: '#ffffff',
        },
        amber: {
          50: '#ffffff', 100: '#f3f3f3', 200: '#e5e5e5', 300: '#ffffff',
          400: '#ffffff', 500: '#ffffff',
        },
        brand: {
          50:  '#ffffff',
          100: '#f3f3f3',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#ffffff',
          600: '#e5e5e5',
          700: '#a3a3a3',
          800: '#737373',
          900: '#404040',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%)',
        'dark-gradient': 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out both',
        'slide-up':   'slideUp 0.5s ease-out both',
        'float':      'float 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow':  'spin 2s linear infinite',
        'bar-fill':   'barFill 1s ease-out both',
        'score-pop':  'scorePop 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,255,255,0.1)' },
          '50%':      { boxShadow: '0 0 50px rgba(255,255,255,0.2)' },
        },
        barFill: {
          '0%':   { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
        scorePop: {
          '0%':   { opacity: '0', transform: 'scale(0.7)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'glow-brand': '0 0 30px rgba(255,255,255,0.15)',
        'glow-green': '0 0 20px rgba(255,255,255,0.1)',
        'glow-red':   '0 0 20px rgba(255,255,255,0.1)',
        'card':       '0 4px 24px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}
