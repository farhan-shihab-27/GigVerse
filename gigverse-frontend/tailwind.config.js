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
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.7' } },
      },
    },
  },
  plugins: [],
}
