/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'pk-accent': '#126869',
        'pk-accent-bright': '#1a9a9c',
        'pk-accent-dim': '#0d4f50',
        'pk-bg': '#080c0c',
        'pk-bg-2': '#0d1515',
        'pk-bg-3': '#111e1e',
        'pk-text': '#e8f0f0',
        'pk-text-dim': '#7a9999',
      },
      fontFamily: {
        'bebas': ['"Bebas Neue"', 'sans-serif'],
        'dm': ['"DM Sans"', 'system-ui', 'sans-serif'],
        'mono': ['"Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
