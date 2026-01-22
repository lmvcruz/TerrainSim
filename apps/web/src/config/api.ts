/**
 * API Configuration
 * Determines the API base URL based on environment
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'

export const config = {
  apiUrl: API_URL,
  wsUrl: WS_URL,
  endpoints: {
    generate: `${API_URL}/generate`,
    logs: `${API_URL}/logs`,
    simulate: {
      create: `${API_URL}/simulate/create`,
      execute: `${API_URL}/simulate/execute`,
      session: (sessionId: string) => `${API_URL}/simulate/session/${sessionId}`,
    },
    dev: {
      logs: `${API_URL}/dev/logs`,
    },
  },
} as const

export default config
