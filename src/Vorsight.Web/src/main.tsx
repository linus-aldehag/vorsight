import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App.tsx'
import { MachineProvider } from './context/MachineContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MachineProvider>
        <App />
      </MachineProvider>
    </BrowserRouter>
  </StrictMode>,
)
