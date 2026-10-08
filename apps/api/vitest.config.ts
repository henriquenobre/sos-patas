import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Recria o banco sospatas_teste com as migrations (o mesmo preparo dos testes de db/)
    globalSetup: ['./src/testes/preparar-banco.ts'],
    // Os testes usam o mesmo banco: um arquivo por vez
    fileParallelism: false,
  },
})
