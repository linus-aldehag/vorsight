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

prepareApp().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>,
  )
});

