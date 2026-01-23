import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize log collector in development mode
import './utils/logCollector'

// Initialize remote logger for sending logs to backend
import './utils/remote-logger'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
