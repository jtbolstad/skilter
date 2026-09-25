import { tilfeldig } from './dekor';

/** Koordinatsystem for bannerformene; tegnes strukket over hele bannerrammen. */
export const BANNER_B = 1000;
export const BANNER_H = 200;

const f = (v: number) => Math.round(v * 10) / 10;

/** Penselstrøk med ujevne kanter og frynsete ender, som i utkastet. */
export function penselstrok(fro = 3): string {
  const t = tilfeldig(fro);
  const topp: string[] = [];
  const bunn: string[] = [];
  for (let x = 30; x <= BANNER_B - 30; x += 25) {
    topp.push(`L${f(x)} ${f(6 + t() * 10)}`);
    bunn.unshift(`L${f(x)} ${f(BANNER_H - 6 - t() * 10)}`);
  }
  // Frynsete ender: sagtenner med varierende lengde
  /** @param ut 1 = frynsene peker mot høyre, -1 = mot venstre */
  const ende = (x0: number, ut: 1 | -1, fraTopp: boolean) => {
    const deler: string[] = [];
    const steg = 14;
    for (let i = 1; i < BANNER_H / steg; i++) {
      const y = fraTopp ? i * steg : BANNER_H - i * steg;
      const innerst = x0 - ut * t() * 25;
      const ytterst = x0 + ut * (2 + t() * 21);
      // Innerste punkt ligger midt mellom forrige og denne tannen
      const mellom = fraTopp ? y - steg / 2 : y + steg / 2;
      deler.push(`L${f(innerst)} ${f(mellom)}L${f(ytterst)} ${f(y)}`);
    }
    return deler.join('');
  };
  return (
    `M30 ${f(8 + t() * 6)}` +
    topp.join('') +
    `L${BANNER_B - 30} 10` +
    ende(BANNER_B - 25, 1, true) +
    `L${BANNER_B - 30} ${BANNER_H - 10}` +
    bunn.join('') +
    `L30 ${BANNER_H - 8}` +
    ende(25, -1, false) +
    'Z'
  );
}

/** Bånd med innbrettede ender. Returnerer hovedflate og de mørkere endeflikene. */
export function band(): { flate: string; flikene: string } {
  const inn = 60;
  const brett = 30;
  const topp = 25;
  const bunn = BANNER_H - 10;
  const flate = `M${inn} ${topp}H${BANNER_B - inn}V${bunn - 15}H${inn}Z`;
  const flikene =
    // venstre flik: stikker ut under og bak hovedflaten, med V-kutt
    `M${inn} ${topp + brett}H0L${brett} ${f((topp + brett + bunn) / 2)}L0 ${bunn}H${inn + brett}L${inn} ${bunn - 15}Z` +
    `M${BANNER_B - inn} ${topp + brett}H${BANNER_B}L${BANNER_B - brett} ${f((topp + brett + bunn) / 2)}L${BANNER_B} ${bunn}H${BANNER_B - inn - brett}L${BANNER_B - inn} ${bunn - 15}Z`;
  return { flate, flikene };
}
