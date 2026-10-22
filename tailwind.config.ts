import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#05080c',
        panel: '#0b1220',
        'panel-2': '#0f172a',
        border: '#1e293b',
        'border-2': '#293548',
        txt: '#e2e8f0',
        'txt-dim': '#94a3b8',
        brand: {
          cyan: '#22d3ee',
          'cyan-strong': '#06b6d4',
          green: '#34d399',
          'green-strong': '#10b981',
          amber: '#fbbf24',
          orange: '#fb923c',
          rose: '#f43f5e',
          violet: '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        cyan: '0 0 0 1px rgba(34,211,238,.35), 0 10px 30px -10px rgba(34,211,238,.25)',
      },
    },
  },
  plugins: [],
};
export default config;
