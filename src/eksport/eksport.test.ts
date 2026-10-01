import { describe, expect, it } from 'vitest';
import type { Skilt } from '../modell/typer';
import { eksportmal, filnavn, SLUGG_MM, trykkside, tidsstempel, UTFALL_MM } from './eksport';

const skilt = {
  navn: 'skilter',
  format: { bredde_mm: 841, hoyde_mm: 594, dpi: 300 },
  banner: { tittel: 'ET HISTORISK KULTURLANDSKAP – Ljabrù/Øst', undertittel: [], farge: '' },
} as unknown as Skilt;

describe('eksport', () => {
  it('beregner pikselstørrelse', () => {
    expect(eksportmal(skilt, 300)).toEqual({
      bredde_px: 9933,
      hoyde_px: 7016,
      megapiksler: (9933 * 7016) / 1e6,
    });
    expect(eksportmal(skilt, 150).bredde_px).toBe(4967);
  });

  it('lager trygge filnavn', () => {
    expect(filnavn(skilt, 300, 'png')).toBe('et-historisk-kulturlandskap-ljabru-ost-841x594mm-300dpi.png');
    expect(filnavn(skilt, 300, 'pdf')).toBe('et-historisk-kulturlandskap-ljabru-ost-841x594mm.pdf');
    expect(filnavn(skilt, 150, 'png', true)).toBe(
      'et-historisk-kulturlandskap-ljabru-ost-841x594mm-150dpi-utkast.png',
    );
    expect(filnavn(skilt, 300, 'pdf', true)).toBe(
      'et-historisk-kulturlandskap-ljabru-ost-841x594mm-utkast.pdf',
    );
  });

  it('legger dato og klokkeslett bakerst i filnavnet når det oppgis', () => {
    const tid = new Date(2026, 9, 1, 14, 5);
    expect(tidsstempel(tid)).toBe('2026-10-01-1405');
    expect(filnavn(skilt, 300, 'pdf', false, false, tid)).toBe(
      'et-historisk-kulturlandskap-ljabru-ost-841x594mm-2026-10-01-1405.pdf',
    );
    expect(filnavn(skilt, 300, 'pdf', true, true, tid)).toBe(
      'et-historisk-kulturlandskap-ljabru-ost-841x594mm-trykkmerker-utkast-2026-10-01-1405.pdf',
    );
  });

  it('legger merker i filnavnet', () => {
    expect(filnavn(skilt, 300, 'pdf', false, true)).toBe(
      'et-historisk-kulturlandskap-ljabru-ost-841x594mm-trykkmerker.pdf',
    );
  });
});

describe('trykkside', () => {
  const side = trykkside(841, 594);

  it('gir plass til slugg på alle sider', () => {
    expect(side.bredde).toBe(841 + 2 * SLUGG_MM);
    expect(side.hoyde).toBe(594 + 2 * SLUGG_MM);
    expect(side.skilt).toEqual({ x: SLUGG_MM, y: SLUGG_MM });
  });

  it('har to merker per hjørne og ett midt på hver side', () => {
    expect(side.linjer).toHaveLength(4 * 2 + 4);
  });

  it('holder merkene utenfor utfallet og innenfor papiret', () => {
    const x0 = SLUGG_MM;
    const x1 = SLUGG_MM + 841;
    const y0 = SLUGG_MM;
    const y1 = SLUGG_MM + 594;
    for (const l of side.linjer) {
      for (const [x, y] of [
        [l.x1, l.y1],
        [l.x2, l.y2],
      ] as const) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(side.bredde);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(side.hoyde);
        // Ingen ende ligger inne i utfallssonen rundt skiltet
        const innenforUtfall =
          x > x0 - UTFALL_MM && x < x1 + UTFALL_MM && y > y0 - UTFALL_MM && y < y1 + UTFALL_MM;
        expect(innenforUtfall).toBe(false);
      }
    }
  });

  it('plasserer øvre venstre hjørnemerke langs beskjæringslinjene', () => {
    const vannrett = side.linjer.find((l) => l.y1 === SLUGG_MM && l.y2 === SLUGG_MM && l.x2 < SLUGG_MM);
    const loddrett = side.linjer.find((l) => l.x1 === SLUGG_MM && l.x2 === SLUGG_MM && l.y2 < SLUGG_MM);
    expect(vannrett).toBeDefined();
    expect(loddrett).toBeDefined();
  });
});
