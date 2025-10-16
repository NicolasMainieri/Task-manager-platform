/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors that adapt to theme
        'app-bg': {
          DEFAULT: '#ffffff', // light mode
          dark: '#0f172a', // dark mode (slate-900)
        },
        'app-surface': {
          DEFAULT: '#f8fafc', // light mode (slate-50)
          dark: '#1e293b', // dark mode (slate-800)
        },
        'app-border': {
          DEFAULT: '#e2e8f0', // light mode (slate-200)
          dark: '#334155', // dark mode (slate-700)
        },
        'app-text': {
          DEFAULT: '#0f172a', // light mode (slate-900)
          dark: '#f8fafc', // dark mode (slate-50)
        },
        'app-text-secondary': {
          DEFAULT: '#64748b', // light mode (slate-500)
          dark: '#94a3b8', // dark mode (slate-400)
        },
      },
    },
  },
  plugins: [],
}