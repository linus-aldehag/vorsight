import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App.tsx'
import { ThemeProvider } from './context/ThemeContext';

async function prepareApp() {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    const { setupDemoServer } = await import('./demo/setupDemo');
    setupDemoServer();
  }
}

function getBasename(): string {
  let base = import.meta.env.BASE_URL || '/';
  if (base.startsWith('.')) base = base.slice(1);
  if (base.startsWith('/.')) base = base.slice(2);

  if (!base || base === '/') {
    const match = window.location.pathname.match(/^(\/[^/]+)/);
    const knownRoutes = ['/dashboard', '/settings', '/activity', '/gallery', '/audit', '/schedule'];
    if (match && !knownRoutes.includes(match[1]) && !match[1].startsWith('/machine-')) {
      return match[1];
    }
    return '';
  }
  return base.endsWith('/') && base.length > 1 ? base.slice(0, -1) : base;
}

prepareApp().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter basename={getBasename()}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>,
  )
});

