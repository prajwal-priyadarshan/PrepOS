import React from 'react';
import ReactDOM from 'react-dom/client';
// One family for the whole app - headings, body and UI chrome alike. The
// monospace roles take the system stack, so nothing else is bundled.
import '@fontsource-variable/source-serif-4';
import App from './App';
import { applyTheme, useTheme } from './store/useTheme';
import './styles/tokens.css';

// The inline script in index.html has already stamped this before first paint.
// Re-stamping costs nothing and keeps the DOM honest if that script is ever
// dropped, so the two can never silently disagree.
applyTheme(useTheme.getState().theme);

const root = document.getElementById('root');
if (!root) throw new Error('#root missing from index.html');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
