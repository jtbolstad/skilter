/** Fontene appen følger med. Alle er statiske fontfiler, så de bygges inn i PDF-en. */
export const FONTER = [
  { id: 'serif', navn: 'Source Serif', familie: "'Source Serif 4', 'Noto Serif', Georgia, serif" },
  { id: 'lora', navn: 'Lora', familie: "'Lora', 'Noto Serif', Georgia, serif" },
  { id: 'merriweather', navn: 'Merriweather', familie: "'Merriweather', 'Noto Serif', Georgia, serif" },
  { id: 'garamond', navn: 'EB Garamond', familie: "'EB Garamond', 'Noto Serif', Georgia, serif" },
  { id: 'playfair', navn: 'Playfair Display', familie: "'Playfair Display', 'Noto Serif', Georgia, serif" },
  { id: 'roboto-slab', navn: 'Roboto Slab', familie: "'Roboto Slab', 'Noto Serif', Georgia, serif" },
  { id: 'sans', navn: 'Source Sans', familie: "'Source Sans 3', 'Noto Sans', system-ui, sans-serif" },
  { id: 'open-sans', navn: 'Open Sans', familie: "'Open Sans', 'Noto Sans', system-ui, sans-serif" },
  { id: 'oswald', navn: 'Oswald (smal)', familie: "'Oswald', 'Noto Sans', system-ui, sans-serif" },
] as const;

export type Fontnavn = (typeof FONTER)[number]['id'];

/** CSS-fontfamilien til en font. Ukjente navn (f.eks. fra en nyere versjon) gir Source Serif. */
export function fontfamilie(font: string | undefined): string {
  return (FONTER.find((f) => f.id === font) ?? FONTER[0]).familie;
}
