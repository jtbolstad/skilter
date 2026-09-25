import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/source-serif-4';
import './index.css';
import { App } from './App';
import { lagDemomappe } from './fil/mappetilgang';
import { importerMappe } from './modell/importerMappe';
import { useSkilt } from './store';

if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
  const mappe = await lagDemomappe();
  useSkilt.getState().apneProsjekt(mappe, await importerMappe(mappe));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
