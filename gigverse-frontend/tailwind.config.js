/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // UIU Brand — Orange & White palette
        brand: {
          50: '#fff4eb',
          100: '#ffe6d1',
          200: '#ffc8a1',
          300: '#ffaa70',
          400: '#ff863b',
          500: '#f26522', // Pure UIU Orange
          600: '#d95315',
          700: '#b0420f',
          800: '#8c360e',
          900: '#732e0e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 4px 24px rgba(249, 115, 22, 0.18)',
        'brand-lg': '0 8px 40px rgba(249, 115, 22, 0.24)',
        'glow-brand': '0 0 20px rgba(242, 101, 34, 0.35), 0 0 60px rgba(242, 101, 34, 0.10)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.35s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'progress-fill': 'progressFill 0.8s ease-out forwards',
        'bell-ring': 'bellRing 0.6s ease-in-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.7' } },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 8px rgba(242, 101, 34, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(242, 101, 34, 0.6), 0 0 40px rgba(242, 101, 34, 0.2)' },
        },
        progressFill: {
          from: { width: '0%' },
          to: { width: 'var(--progress-width, 0%)' },
        },
        bellRing: {
          '0%': { transform: 'rotate(0)' },
          '15%': { transform: 'rotate(14deg)' },
          '30%': { transform: 'rotate(-12deg)' },
          '45%': { transform: 'rotate(10deg)' },
          '60%': { transform: 'rotate(-8deg)' },
          '75%': { transform: 'rotate(4deg)' },
          '100%': { transform: 'rotate(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
