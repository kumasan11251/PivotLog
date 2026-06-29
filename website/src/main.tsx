import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// 末尾スラッシュを正規化（`/privacy/` → `/privacy`、ルート `/` はそのまま）。
// SSR(App path=...) と一致させ、hydration mismatch を避ける。
const rawPath = window.location.pathname;
const path = rawPath !== '/' ? rawPath.replace(/\/+$/, '') : '/';

const app = (
  <React.StrictMode>
    <App path={path} />
  </React.StrictMode>
);

const root = document.getElementById('root')!;

if (root.hasChildNodes()) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
