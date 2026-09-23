import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // exceljs se importa de forma dinámica (solo al exportar). Sin esto, Vite
  // lo descubre recién en ese momento, re-optimiza las dependencias y el
  // navegador falla con "Failed to fetch dynamically imported module".
  optimizeDeps: {
    include: ['exceljs'],
  },
})