import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Em desenvolvimento, /api vai para o `wrangler dev` (mesma origem, como em produção).
    // changeOrigin: false mantém o Host da página (localhost:5173 ou o IP, no celular): a API
    // compara o Host com a Origin para recusar escritas vindas de outro site (middleware/origem.ts).
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/testes/configurar.ts'],
  },
})
