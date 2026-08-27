import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/public-sans';
import App from './App';
import './styles/tokens.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing from index.html');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
