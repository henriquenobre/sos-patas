import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['./testes/preparar.ts'],
    // Os testes usam o mesmo banco: um arquivo por vez
    fileParallelism: false,
  },
})
