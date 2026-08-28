import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/public-sans';
import App from './App';
import { applyTheme, useTheme } from './store/useTheme';
import './styles/tokens.css';

// The inline script in index.html has already stamped this before first paint.
// Re-stamping costs nothing and keeps the DOM honest if that script is ever
// dropped, so the two can never silently disagree.
applyTheme(useTheme.getState().resolved);

const root = document.getElementById('root');
if (!root) throw new Error('#root missing from index.html');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
