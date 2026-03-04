import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { marked } from 'marked'
import '@/index.css'
import App from '@/App.jsx'

const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/'
if (typeof window !== 'undefined') window.marked = marked

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={base}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
