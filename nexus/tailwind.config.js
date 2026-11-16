/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: { 950: '#05070d', 900: '#080b14', 850: '#0b0f1b', 800: '#0f1424', 700: '#161c30', 600: '#222a44', 500: '#38415f', 400: '#6b7595', 300: '#9aa3c0', 200: '#c7cde0', 100: '#e7eaf3' },
        mem: '#a78bfa', att: '#22d3ee', spd: '#fbbf24', rea: '#34d399', spa: '#60a5fa', lan: '#f472b6', cal: '#a3e635', cre: '#fb923c', met: '#cbd5e1',
      },
      boxShadow: { glow: '0 0 0 1px rgba(255,255,255,.06), 0 8px 40px -12px rgba(0,0,0,.8)' },
    },
  },
  plugins: [],
};
