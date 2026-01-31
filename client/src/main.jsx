import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import './index.css'
import App from './App.jsx'
import posthog from "posthog-js"

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: "https://app.posthog.com",
  capture_pageview: true
})


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
