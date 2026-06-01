/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts,scss}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B6E4F',
          50: '#E6F4F0',
          100: '#C2E3D9',
          200: '#8FCBBA',
          300: '#5CB39A',
          400: '#2E9B80',
          500: '#0B6E4F',
          600: '#095C41',
          700: '#074A34',
          800: '#053826',
          900: '#022619',
        },
        surface: {
          DEFAULT: '#F8FAF9',
          card: '#FFFFFF',
          border: '#E2E8E5',
        },
        status: {
          pending: '#F59E0B',
          approved: '#10B981',
          rejected: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
