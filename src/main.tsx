import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AppSync from './AppSync.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppSync />
  </StrictMode>
);
