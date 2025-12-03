/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Sets default sans font to Inter
        sans: ['Inter', 'sans-serif'],
        // Sets default serif font to Martel (for body text)
        serif: ['Martel', 'serif'],
        // Adds specific font for titles (usage: font-ancient)
        ancient: ['Cinzel', 'serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}