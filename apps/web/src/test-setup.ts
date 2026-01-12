import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// Mock ResizeObserver for React Three Fiber
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Run cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup()
})
