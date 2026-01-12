import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/test-setup.ts',
        '**/test-helpers.ts',
        '**/debug-*.ts',
        '**/*.config.ts',
        '**/main.tsx', // Entry point
      ],
      reportsDirectory: './coverage',
    },
  },
})
