import { describe, expect, it } from 'vitest';
import { FONTER, fontfamilie } from './fonter';

describe('fontfamilie', () => {
  it('gir fontfamilien med reservefonter', () => {
    expect(fontfamilie('lora')).toMatch(/^'Lora', 'Noto Serif'/);
    expect(fontfamilie('sans')).toContain('Source Sans 3');
  });

  it('ukjent eller manglende font gir Source Serif', () => {
    expect(fontfamilie('comic-sans')).toBe(FONTER[0].familie);
    expect(fontfamilie(undefined)).toBe(FONTER[0].familie);
  });

  it('id-ene er unike', () => {
    expect(new Set(FONTER.map((f) => f.id)).size).toBe(FONTER.length);
  });
});
