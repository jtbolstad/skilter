import type { Rektangel } from '../modell/typer';

/**
 * Justering av flere valgte rammer. Alle funksjonene tar og gir rammene i samme rekkefølge,
 * og endrer bare det justeringen gjelder.
 */

export type Kant = 'venstre' | 'hoyre' | 'topp' | 'bunn' | 'midt-vannrett' | 'midt-loddrett';
export type Akse = 'vannrett' | 'loddrett';

/** Samme bredde (vannrett) eller høyde (loddrett) som den største eller minste. Posisjonen beholdes. */
export function sammeStorrelse(rammer: Rektangel[], akse: Akse, som: 'storste' | 'minste'): Rektangel[] {
  const felt = akse === 'vannrett' ? 'b' : 'h';
  const verdier = rammer.map((r) => r[felt]);
  const mal = som === 'storste' ? Math.max(...verdier) : Math.min(...verdier);
  return rammer.map((r) => ({ ...r, [felt]: mal }));
}

/** Retter inn rammene langs en kant, mot den ytterste (eller mot midten av alle). */
export function rettInn(rammer: Rektangel[], kant: Kant): Rektangel[] {
  if (rammer.length === 0) return [];
  const venstre = Math.min(...rammer.map((r) => r.x));
  const hoyre = Math.max(...rammer.map((r) => r.x + r.b));
  const topp = Math.min(...rammer.map((r) => r.y));
  const bunn = Math.max(...rammer.map((r) => r.y + r.h));
  return rammer.map((r) => {
    switch (kant) {
      case 'venstre':
        return { ...r, x: venstre };
      case 'hoyre':
        return { ...r, x: hoyre - r.b };
      case 'topp':
        return { ...r, y: topp };
      case 'bunn':
        return { ...r, y: bunn - r.h };
      case 'midt-vannrett':
        return { ...r, x: (venstre + hoyre) / 2 - r.b / 2 };
      case 'midt-loddrett':
        return { ...r, y: (topp + bunn) / 2 - r.h / 2 };
      default:
        return r;
    }
  });
}

/**
 * Lik avstand mellom rammene langs aksen. Den første og siste (etter posisjon) blir stående, og de
 * andre fordeles så mellomrommene blir like. Med færre enn tre rammer endres ingenting.
 */
export function likAvstand(rammer: Rektangel[], akse: Akse): Rektangel[] {
  if (rammer.length < 3) return rammer.map((r) => ({ ...r }));
  const [pos, str] = akse === 'vannrett' ? (['x', 'b'] as const) : (['y', 'h'] as const);
  const rekkefolge = rammer.map((_, i) => i).sort((a, b) => rammer[a]![pos] - rammer[b]![pos]);
  const forste = rammer[rekkefolge[0]!]!;
  const siste = rammer[rekkefolge.at(-1)!]!;
  const sum = rammer.reduce((s, r) => s + r[str], 0);
  const mellomrom = (siste[pos] + siste[str] - forste[pos] - sum) / (rammer.length - 1);

  const ut = rammer.map((r) => ({ ...r }));
  let p = forste[pos];
  for (const i of rekkefolge) {
    ut[i]![pos] = p;
    p += rammer[i]![str] + mellomrom;
  }
  return ut;
}
