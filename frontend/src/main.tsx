import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/source-sans-3';
import App from '@/App';
import '@/index.css';
import '@/styles/modals.css';
import '@/styles/avatar.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontro el elemento root');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
