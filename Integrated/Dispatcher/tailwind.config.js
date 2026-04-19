/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        command: {
          bg: '#08131f',
          panel: '#102235',
          panel2: '#0d1c2b',
          border: '#1d4460',
          blue: '#1873ba',
          cyan: '#22d3ee',
          red: '#ef4444',
          amber: '#f59e0b',
          green: '#10b981',
          slate: '#91a4b7',
          ink: '#e8f1f8',
        },
      },
      fontFamily: {
        body: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Barlow Condensed', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 24px 60px rgba(1, 8, 20, 0.42)',
        glow: '0 0 0 1px rgba(34, 211, 238, 0.15), 0 12px 28px rgba(24, 115, 186, 0.24)',
      },
      keyframes: {
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(239,68,68,.5)' },
          '70%': { boxShadow: '0 0 0 12px rgba(239,68,68,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulseRing 2s infinite',
      },
      backgroundImage: {
        'command-grid': 'linear-gradient(rgba(24,115,186,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(24,115,186,0.10) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
