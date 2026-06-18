/**
 * Application entry point.
 * Mounts the React tree into #root with StrictMode and client-side routing.
 *
 * StrictMode intentionally invokes effects twice in development to surface
 * side-effect bugs — the isInitialized ref in useActivityTracker guards against this.
 *
 * Global styles load order:
 *   1. index.css  — base resets and typography
 *   2. variables.css — app-level CSS custom properties (colours, spacing)
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/variables.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
