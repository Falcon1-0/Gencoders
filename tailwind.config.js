/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#04091a',
          900: '#0a0e1a',
          800: '#0d1526',
          700: '#111827',
          600: '#1a2236',
          500: '#1e2d47',
          400: '#2a3a54'
        },
        sentinel: {
          cyan:   '#00d4ff',
          green:  '#00e096',
          amber:  '#ffb347',
          red:    '#ff4d6d',
          purple: '#a78bfa'
        }
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['"IBM Plex Sans"', 'sans-serif']
      },
      animation: {
        pulse2: 'pulse 1.4s ease-in-out infinite',
        fadeIn: 'fadeIn 0.3s ease-in-out'
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
