import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './frontend/styles/app.css'
import App from './App.tsx';
import ThemeProvider from './frontend/theme/theme-provider.tsx';
import { initializeTheme } from './frontend/theme/theme-preference.ts';

initializeTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
