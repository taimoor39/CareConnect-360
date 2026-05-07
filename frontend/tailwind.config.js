/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        care: {
          navy: '#0f172a',
          teal: '#14b8a6',
          surface: '#ffffff',
          border: '#f1f5f9',
        },
        health: {
          50: '#ecfffb',
          100: '#cffdf3',
          500: '#13b29a',
          600: '#0f8f7c',
          700: '#0e7164',
          900: '#0a3d3b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xxs: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        fluidLabel: ['clamp(0.75rem, 0.72rem + 0.15vw, 0.875rem)', { lineHeight: '1.25rem' }],
        fluidBody: ['clamp(0.875rem, 0.84rem + 0.2vw, 1rem)', { lineHeight: '1.5rem' }],
        fluidMetric: ['clamp(1.25rem, 1rem + 1vw, 1.5rem)', { lineHeight: '1.2' }],
      },
      boxShadow: {
        glow: '0 20px 60px -24px rgba(19, 178, 154, 0.65)',
        tealGlow: '0 0 0 1px rgba(45, 212, 191, 0.35), 0 10px 30px -18px rgba(45, 212, 191, 0.85)',
      },
      backgroundImage: {
        pulseGrid:
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)',
      },
      keyframes: {
        floatY: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        floatY: 'floatY 6s ease-in-out infinite',
        fadeUp: 'fadeUp 650ms ease forwards',
      },
    },
  },
  plugins: [],
};
