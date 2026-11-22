import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/source-sans-3';
import App from '@/App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/styles/tokens.css';
import '@/index.css';
import '@/styles/modals.css';
import '@/styles/avatar.css';
import '@/styles/glass.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontro el elemento root');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
