import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Statiske fontfiler: Chrome bytter ut variable fonter med Times ved utskrift til PDF
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/400-italic.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
import '@fontsource/source-serif-4/700-italic.css';
// Reserve for tegn Source Serif mangler, f.eks. «ǫ» i norrøne navn
import '@fontsource/noto-serif/400.css';
import '@fontsource/noto-serif/400-italic.css';
import '@fontsource/noto-serif/700.css';
import './index.css';
import { App } from './App';
import { lagDemomappe } from './fil/mappetilgang';
import { apneProsjekt, glemDemo, startAutolagring } from './fil/prosjekt';

startAutolagring();

const parametre = new URLSearchParams(location.search);
if (import.meta.env.DEV && parametre.has('demo')) {
  // ?demo&ny starter fra tekst.txt i stedet for sist lagrede demo
  if (parametre.has('ny')) await glemDemo();
  await apneProsjekt(await lagDemomappe());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
