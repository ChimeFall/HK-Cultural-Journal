/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        journal: {
          paper: '#F5F0E1',
          stamp: '#8B2635',
          gold: '#D4AF37',
        },
        marker: {
          gray: '#9CA3AF',
          yellow: '#F59E0B',
          green: '#10B981',
        }
      }
    },
  },
  plugins: [],
}
