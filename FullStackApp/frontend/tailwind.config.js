/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050810',
          900: '#070c1a',
          800: '#0a0f1e',
          700: '#0d1426',
          600: '#111827',
          500: '#1a2236',
        },
        brand: {
          50:  '#f0f4ff',
          100: '#e0e8ff',
          200: '#c7d5fe',
          300: '#a5b8fc',
          400: '#8093f9',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0f172a 0%, #0a0f1e 100%)',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(99,102,241,0.25)' },
          '50%':      { boxShadow: '0 0 50px rgba(99,102,241,0.55)' },
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
        'glow-brand': '0 0 30px rgba(99,102,241,0.35)',
        'glow-green': '0 0 20px rgba(34,197,94,0.3)',
        'glow-red':   '0 0 20px rgba(239,68,68,0.3)',
        'card':       '0 4px 24px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}
