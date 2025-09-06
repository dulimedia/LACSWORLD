import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log('🏁 main.tsx loading - React should start immediately');

createRoot(document.getElementById('root')!).render(
  <App />
);

console.log('✅ React render initiated - app should mount now');
