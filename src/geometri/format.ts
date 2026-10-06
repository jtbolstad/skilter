/** Minste og største egendefinerte skiltmål i cm */
export const MIN_FORMAT_CM = 5;
export const MAKS_FORMAT_CM = 1000;

/**
 * Leser et mål i cm slik det skrives for hånd: «84,1», «84.1» eller «84». Gir undefined for tomt,
 * ugyldig eller utenfor MIN_FORMAT_CM–MAKS_FORMAT_CM.
 */
export function lesCm(tekst: string): number | undefined {
  const rent = tekst.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(rent)) return undefined;
  const cm = Number(rent);
  return cm >= MIN_FORMAT_CM && cm <= MAKS_FORMAT_CM ? cm : undefined;
}

/** mm som cm med komma og høyst to desimaler uten bakerste nuller: 841 → «84,1», 600 → «60» */
export function formaterCm(mm: number): string {
  return String(Math.round(mm * 10) / 100).replace('.', ',');
}

/** cm til mm uten flyttallsstøy: 84.1 → 841 */
export const cmTilMm = (cm: number): number => Math.round(cm * 100) / 10;
