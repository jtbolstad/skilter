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
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/400-italic.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/source-sans-3/700-italic.css';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/700.css';
import './index.css';
import { App } from './App';
import { lagDemomappe, lagInnebygdDemo } from './fil/mappetilgang';
import { apneProsjekt, glemDemo, startAutolagring } from './fil/prosjekt';
import { startGestsporing } from './modell/historikk';

startAutolagring();
startGestsporing();

const parametre = new URLSearchParams(location.search);
// ?demo åpner prosjektmappa over app/ (bare i dev), ?demo=innebygd demoprosjektet som følger med appen
const demo = parametre.get('demo');
if (demo === 'innebygd' || (import.meta.env.DEV && demo !== null)) {
  const mappe = demo === 'innebygd' ? await lagInnebygdDemo() : await lagDemomappe();
  // &ny starter fra tekstfila i stedet for sist lagrede demo
  if (parametre.has('ny')) await glemDemo(mappe);
  await apneProsjekt(mappe);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
