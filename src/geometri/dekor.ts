import type { Dekortype } from '../modell/typer';

export interface Dekorgrafikk {
  bredde: number;
  hoyde: number;
  /** Fylte flater (fill-rule evenodd) */
  fyll: string[];
  /** Linjer */
  strek: string[];
  strekbredde: number;
  tekst?: { x: number; y: number; storrelse: number; innhold: string }[];
}

export const DEKORTYPER: { type: Dekortype; navn: string; standard: { b: number; h: number } }[] = [
  { type: 'granskog', navn: 'Granskog', standard: { b: 160, h: 55 } },
  { type: 'lovskog', navn: 'Løvskog', standard: { b: 160, h: 50 } },
  { type: 'steinbro', navn: 'Steinbro', standard: { b: 110, h: 50 } },
  { type: 'gress', navn: 'Gress og bregner', standard: { b: 260, h: 22 } },
  { type: 'kompass', navn: 'Kompassrose', standard: { b: 40, h: 40 } },
];

/** Enkel deterministisk tilfeldighetsgenerator (mulberry32). */
export function tilfeldig(fro: number): () => number {
  let a = fro >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (v: number) => Math.round(v * 10) / 10;

function granskog(b: number, h: number, t: () => number): Dekorgrafikk {
  const fyll: string[] = [];
  let x = t() * 4;
  for (;;) {
    const th = h * (0.55 + t() * 0.45);
    const tb = th * (0.36 + t() * 0.1);
    // Nederste greinlag er bredest: tb/2 * 0.99
    if (x + tb > b) break;
    const cx = x + tb / 2;
    const bunn = h;
    // Tre lag med grener og en stamme
    let d = `M${f(cx - th * 0.03)} ${f(bunn)}h${f(th * 0.06)}v${f(-th * 0.12)}h${f(-th * 0.06)}Z`;
    for (let lag = 0; lag < 3; lag++) {
      const topp = bunn - th + (lag * th) / 4.2;
      const fot = bunn - th * 0.1 - (2 - lag) * th * 0.22;
      const halv = (tb / 2) * (0.55 + lag * 0.22);
      d += `M${f(cx)} ${f(topp)}L${f(cx + halv)} ${f(fot)}L${f(cx - halv)} ${f(fot)}Z`;
    }
    fyll.push(d);
    x += tb * (0.55 + t() * 0.5);
  }
  return { bredde: b, hoyde: h, fyll, strek: [], strekbredde: 0 };
}

function lovskog(b: number, h: number, t: () => number): Dekorgrafikk {
  const fyll: string[] = [];
  const sirkel = (cx: number, cy: number, r: number) =>
    `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  let x = t() * 6;
  for (;;) {
    const th = h * (0.6 + t() * 0.4);
    const r = th * (0.26 + t() * 0.08);
    // Sidekronene rekker 1,35 r ut fra midten
    const cx = x + r * 1.35;
    if (cx + r * 1.35 > b) break;
    const stamme = `M${f(cx - r * 0.1)} ${f(h)}h${f(r * 0.2)}v${f(-th * 0.45)}h${f(-r * 0.2)}Z`;
    const krone = [
      sirkel(cx, h - th + r, r),
      sirkel(cx - r * 0.6, h - th + r * 1.6, r * 0.75),
      sirkel(cx + r * 0.6, h - th + r * 1.6, r * 0.75),
    ];
    fyll.push(stamme, ...krone);
    x += r * (1.3 + t() * 0.8);
  }
  return { bredde: b, hoyde: h, fyll, strek: [], strekbredde: 0 };
}

function steinbro(b: number, h: number): Dekorgrafikk {
  const dekk = h * 0.18;
  const cx = b / 2;
  const bunn = h * 0.78;
  const bue = Math.min(b * 0.3, (bunn - dekk) * 0.78);
  // Brokropp med buen skåret ut
  const kropp =
    `M0 ${f(dekk)}L${f(b)} ${f(dekk)}L${f(b)} ${f(bunn)}L${f(cx + bue)} ${f(bunn)}` +
    `A${f(bue)} ${f(bue)} 0 0 0 ${f(cx - bue)} ${f(bunn)}L0 ${f(bunn)}Z`;
  const rekkverk = `M0 ${f(dekk * 0.35)}h${f(b)}v${f(dekk * 0.25)}h${f(-b)}Z`;

  const strek: string[] = [];
  // Hvelvsteiner rundt buen
  // Hvelvsteinene når nesten opp til dekket, men ikke over
  const ytre = bue + (bunn - dekk - bue) * 0.8;
  for (let i = 0; i <= 12; i++) {
    const v = Math.PI - (i * Math.PI) / 12;
    const c = Math.cos(v);
    const s = Math.sin(v);
    strek.push(`M${f(cx + c * bue)} ${f(bunn - s * bue)}L${f(cx + c * ytre)} ${f(bunn - s * ytre)}`);
  }
  // Steinskift på sidene, med forskjøvne loddfuger
  const skift = (bunn - dekk) / 4;
  const steinB = skift * 2.2;
  for (let i = 0; i < 4; i++) {
    const y0 = dekk + i * skift;
    const y1 = y0 + skift;
    // Buen skjærer skiftet: unngå fuger inne i åpningen
    const kant = (y: number) => Math.sqrt(Math.max(0, bue * bue - (bunn - y) ** 2));
    const innerst = Math.max(kant(y0), kant(y1)) + (bunn - dekk - bue) * 0.8 * (i >= 2 ? 1 : 0.3);
    if (i > 0) {
      for (const [fra, til] of [
        [0, cx - kant(y0)],
        [cx + kant(y0), b],
      ] as const) {
        if (til - fra > 2) strek.push(`M${f(fra)} ${f(y0)}H${f(til)}`);
      }
    }
    for (let x = (i % 2) * (steinB / 2) + steinB; x < b; x += steinB) {
      if (Math.abs(x - cx) > innerst) strek.push(`M${f(x)} ${f(y0)}V${f(y1)}`);
    }
  }
  // Vann under buen
  for (let i = 0; i < 3; i++) {
    const y = bunn + (h - bunn) * (0.3 + i * 0.3);
    const bredde = bue * (1.6 - i * 0.3);
    const x0 = cx - bredde;
    let d = `M${f(x0)} ${f(y)}`;
    for (let x = x0; x < cx + bredde; x += bredde / 4) d += `q${f(bredde / 8)} ${f(-1.4)} ${f(bredde / 4)} 0`;
    strek.push(d);
  }
  return { bredde: b, hoyde: h, fyll: [kropp, rekkverk], strek, strekbredde: Math.max(0.5, h * 0.012) };
}

function gress(b: number, h: number, t: () => number): Dekorgrafikk {
  const fyll: string[] = [];
  for (let x = 0; x < b; x += 0.8 + t() * 1.4) {
    const hoyde = h * (0.3 + t() * 0.7);
    const bredde = 0.6 + t() * 0.8;
    // Hold spissen innenfor rammen
    const held = Math.min(b - x - bredde, Math.max(-x, (t() - 0.5) * hoyde * 0.6));
    if (x + bredde > b) break;
    fyll.push(
      `M${f(x)} ${f(h)}Q${f(x + held * 0.3)} ${f(h - hoyde * 0.6)} ${f(x + held)} ${f(h - hoyde)}` +
        `Q${f(x + bredde + held * 0.3)} ${f(h - hoyde * 0.6)} ${f(x + bredde)} ${f(h)}Z`,
    );
    // Av og til en bregne
    const bh = h * (0.7 + t() * 0.3);
    if (t() < 0.04 && x > bh / 3 && x + bh / 3 < b) {
      let d = `M${f(x)} ${f(h)}L${f(x + 0.5)} ${f(h - bh)}L${f(x + 1)} ${f(h)}Z`;
      for (let i = 1; i < 7; i++) {
        const y = h - (bh * i) / 7;
        const l = (bh / 3) * (1 - i / 8);
        d += `M${f(x + 0.5)} ${f(y)}q${f(-l * 0.6)} ${f(-l * 0.1)} ${f(-l)} ${f(l * 0.35)}q${f(l * 0.5)} 0 ${f(l)} ${f(-l * 0.25)}Z`;
        d += `M${f(x + 0.5)} ${f(y)}q${f(l * 0.6)} ${f(-l * 0.1)} ${f(l)} ${f(l * 0.35)}q${f(-l * 0.5)} 0 ${f(-l)} ${f(-l * 0.25)}Z`;
      }
      fyll.push(d);
    }
  }
  return { bredde: b, hoyde: h, fyll, strek: [], strekbredde: 0 };
}

function kompass(b: number, h: number): Dekorgrafikk {
  const s = Math.min(b, h);
  const cx = b / 2;
  const cy = h / 2 + s * 0.06;
  const r = s * 0.36;
  const spiss = (vinkel: number, lengde: number, bredde: number) => {
    const v = (vinkel * Math.PI) / 180;
    const px = cx + Math.sin(v) * lengde;
    const py = cy - Math.cos(v) * lengde;
    const sx = Math.cos(v) * bredde;
    const sy = Math.sin(v) * bredde;
    return `M${f(cx + sx)} ${f(cy + sy)}L${f(px)} ${f(py)}L${f(cx - sx)} ${f(cy - sy)}Z`;
  };
  const fyll = [0, 90, 180, 270].map((v) => spiss(v, r, r * 0.16));
  fyll.push(...[45, 135, 225, 315].map((v) => spiss(v, r * 0.6, r * 0.1)));
  const ring = `M${f(cx - r * 0.72)} ${f(cy)}a${f(r * 0.72)} ${f(r * 0.72)} 0 1 0 ${f(r * 1.44)} 0a${f(r * 0.72)} ${f(r * 0.72)} 0 1 0 ${f(-r * 1.44)} 0`;
  return {
    bredde: b,
    hoyde: h,
    fyll,
    strek: [ring],
    strekbredde: s * 0.015,
    tekst: [{ x: cx, y: cy - r - s * 0.03, storrelse: s * 0.13, innhold: 'N' }],
  };
}

/** Tegner dekoren for en ramme på b × h mm. Samme frø gir alltid samme tegning. */
export function tegnDekor(type: Dekortype, b: number, h: number, fro: number): Dekorgrafikk {
  const t = tilfeldig(fro);
  switch (type) {
    case 'granskog':
      return granskog(b, h, t);
    case 'lovskog':
      return lovskog(b, h, t);
    case 'steinbro':
      return steinbro(b, h);
    case 'gress':
      return gress(b, h, t);
    case 'kompass':
      return kompass(b, h);
  }
}
