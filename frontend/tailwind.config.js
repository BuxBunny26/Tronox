/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f6fb',
          100: '#dce9f4',
          200: '#adc6e0',
          300: '#7aa3cc',
          400: '#4a7ab5',
          500: '#2d5c96',
          600: '#254a7a',
          700: '#1e3a5f',
          800: '#152b47',
          900: '#0f1f33',
        },
        accent: {
          100: '#edf7cc',
          400: '#a0d030',
          500: '#80BC00',
          600: '#669900',
        },
      },
    },
  },
  plugins: [],
}
