import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/__tests__/unit/**/*.spec.ts'],
    exclude: ['e2e/**/*'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
  },
})
