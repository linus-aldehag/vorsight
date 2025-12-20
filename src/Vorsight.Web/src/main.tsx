import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import App from './App.tsx'
import { MachineProvider } from './context/MachineContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="dark">
      <MachineProvider>
        <App />
      </MachineProvider>
    </MantineProvider>
  </StrictMode>,
)
