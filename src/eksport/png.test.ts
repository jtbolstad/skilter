import { describe, expect, it } from 'vitest';
import { crc32, lesPngDpi, settPngDpi } from './png';

// 1×1 PNG uten pHYs
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);

describe('png', () => {
  it('crc32 stemmer med kjent verdi', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082);
  });

  it('setter og leser DPI', () => {
    expect(lesPngDpi(PNG)).toBeUndefined();
    const ut = settPngDpi(PNG, 300);
    expect(lesPngDpi(ut)).toBe(300);
    expect(ut.length).toBe(PNG.length + 21);
  });

  it('erstatter eksisterende pHYs', () => {
    const ut = settPngDpi(settPngDpi(PNG, 150), 300);
    expect(lesPngDpi(ut)).toBe(300);
    expect(ut.length).toBe(PNG.length + 21);
  });

  it('avviser filer som ikke er PNG', () => {
    expect(() => settPngDpi(new Uint8Array(40), 300)).toThrow('Ikke en PNG');
  });
});
