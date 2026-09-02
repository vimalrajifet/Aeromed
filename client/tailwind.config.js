/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sap: {
          blue: '#0a6ed1',
          darkBlue: '#0854a1',
          gold: '#df6e0c',
          gray: '#556b82',
          lightBg: '#f5f7fa',
          shell: '#354a5f',
          surface: '#ffffff',
          border: '#d9e1e8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
