/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts,scss}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#126869',
          light: '#1a9a9c',
          dim: '#0d4f50',
          glow: 'rgba(18,104,105,0.4)',
        },
        bg: {
          DEFAULT: '#080c0c',
          2: '#0d1515',
          3: '#111e1e',
        },
        pkour: {
          text: '#e8f0f0',
          'text-dim': '#7a9999',
          'text-muted': '#3d5555',
          border: 'rgba(18,104,105,0.2)',
        },
        status: {
          pending: '#F59E0B',
          approved: '#10B981',
          rejected: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Bebas Neue', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.2)',
        'card-hover': '0 4px 16px 0 rgba(18,104,105,0.2)',
        glow: '0 0 24px rgba(18,104,105,0.3)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
