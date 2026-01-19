import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  base: process.env.BASE_PATH || '/',
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'react/jsx-dev-runtime': path.resolve('./node_modules/react/jsx-dev-runtime.js'),
      'react/jsx-runtime': path.resolve('./node_modules/react/jsx-runtime.js'),
    },
  },
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
