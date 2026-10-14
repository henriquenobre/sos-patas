import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

// findBy e waitFor esperam até 5 s (o padrão é 1 s): no runner do CI, a primeira tela de cada
// arquivo (carregada sob demanda, como a área da ONG) às vezes ainda está em "Carregando…" após 1 s
configure({ asyncUtilTimeout: 5000 })

afterEach(() => {
  cleanup()
})
