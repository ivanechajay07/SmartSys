/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf8',
          100: '#d1faee',
          200: '#a7f3dd',
          300: '#6ee7c7',
          400: '#34d3ac',
          500: '#10b894',
          600: '#05947a',
          700: '#047664',
          800: '#065e51',
          900: '#064d44',
          950: '#022c27',
        },
      },
      fontFamily: {
        sans: ['"Source Sans 3 Variable"', '"Source Sans 3"', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Source Sans 3 Variable"', '"Source Sans 3"', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px -12px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
};
