import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // На Windows импорт из 'vitest' открывает вторую копию пакета:
    // буква диска в адресе модуля отличается регистром, и describe не видит runner.
    globals: true,
  },
})
