/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        tamil: ['Noto Sans Tamil', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        clay: {
          50:  '#fdf6ef',
          100: '#fae9d5',
          200: '#f4d1a9',
          300: '#ecb175',
          400: '#e38d48',
          500: '#dc712a',
          600: '#ce581f',
          700: '#ab431b',
          800: '#88361c',
          900: '#6e2d19',
          950: '#3b140b',
        },
        ink: {
          50:  '#f5f4f1',
          100: '#e8e5df',
          200: '#d2ccbf',
          300: '#b7ad98',
          400: '#9c8e75',
          500: '#8a7a61',
          600: '#756551',
          700: '#5f5043',
          800: '#4e4239',
          900: '#433931',
          950: '#231e19',
        },
        saffron: {
          400: '#f7b733',
          500: '#f59e0b',
          600: '#d97706',
        },
        palm: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-right': 'slideRight 0.3s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
