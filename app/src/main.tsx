import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { TRPCProvider } from '@/providers/trpc'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/Toaster'
import './index.css'
import './styles/tokens.css'
import App from './App.tsx'

// Register service worker for push notifications + PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <TRPCProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </TRPCProvider>
    </BrowserRouter>
  </ErrorBoundary>,
)
