/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cranko: {
          950: '#07050e', // Fundo ultra escuro
          900: '#0e0b1c', // Fundo de cards
          850: '#141029', // Fundo de superfícies elevadas
          800: '#1e183d', // Bordas e divisores sutis
          700: '#2d245c', // Bordas em destaque
          600: '#4c3a99', // Acentos secundários
          500: '#7c3aed', // Roxo elétrico principal
          400: '#9333ea', // Roxo vibrante
          300: '#c084fc', // Lilás de texto e realce
          200: '#e9d5ff', // Lilás claro
          100: '#f5f3ff', // Quase branco
        },
        accent: {
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          violet: '#8b5cf6',
          fuchsia: '#d946ef'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-purple': '0 0 25px -5px rgba(124, 58, 237, 0.35)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'subtle-purple': '0 4px 20px -2px rgba(124, 58, 237, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
