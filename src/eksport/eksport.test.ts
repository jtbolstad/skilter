import { describe, expect, it } from 'vitest';
import type { Skilt } from '../modell/typer';
import { eksportmal, filnavn } from './eksport';

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
  });
});
