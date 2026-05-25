/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Warm dark surface palette — NOT the default slate */
        surface: {
          50:  '#f7f7f8',
          100: '#eeeef0',
          200: '#d9d9de',
          300: '#b8b8c1',
          400: '#91919f',
          500: '#737384',
          600: '#5d5d6c',
          700: '#4c4c58',
          800: '#2a2a32',
          900: '#1a1a22',
          950: '#111118',
        },
        /* Brand primary — teal-mint */
        brand: {
          50:  '#edfcf7',
          100: '#d3f8ea',
          200: '#abf0d9',
          300: '#73e2c2',
          400: '#2dd4a8',
          500: '#14b892',
          600: '#099577',
          700: '#077762',
          800: '#085e4f',
          900: '#074d42',
          950: '#022c26',
        },
        /* Accent — real indigo, not white */
        accent: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2dd4a8 0%, #6366f1 100%)',
        'brand-gradient-subtle': 'linear-gradient(135deg, rgba(45,212,168,0.15) 0%, rgba(99,102,241,0.15) 100%)',
        'dark-gradient': 'linear-gradient(180deg, #111118 0%, #1a1a22 50%, #111118 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      borderRadius: {
        'card': '16px',
        'card-lg': '24px',
        'card-asym': '24px 8px 24px 8px',
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease-out both',
        'slide-up':      'slideUp 0.5s ease-out both',
        'float':         'float 4s ease-in-out infinite',
        'pulse-glow':    'pulseGlow 2s ease-in-out infinite',
        'spin-slow':     'spin 2s linear infinite',
        'bar-fill':      'barFill 1s ease-out both',
        'score-pop':     'scorePop 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
        'tilt-in':       'tiltIn 0.5s ease-out both',
        'scale-in':      'scaleIn 0.4s ease-out both',
        'border-flow':   'borderFlow 3s linear infinite',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(45,212,168,0.1)' },
          '50%':      { boxShadow: '0 0 50px rgba(45,212,168,0.2)' },
        },
        barFill: {
          '0%':   { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
        scorePop: {
          '0%':   { opacity: '0', transform: 'scale(0.7)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        tiltIn: {
          '0%':   { opacity: '0', transform: 'perspective(800px) rotateX(-8deg) translateY(20px)' },
          '100%': { opacity: '1', transform: 'perspective(800px) rotateX(0deg) translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        borderFlow: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      boxShadow: {
        'glow-brand': '0 0 30px rgba(45,212,168,0.2), 0 0 60px rgba(99,102,241,0.1)',
        'glow-green': '0 0 20px rgba(45,212,168,0.15)',
        'glow-red':   '0 0 20px rgba(239,68,68,0.15)',
        'card':       '0 4px 24px rgba(0,0,0,0.5)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(45,212,168,0.1)',
        'elevated':   '0 20px 60px -12px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
