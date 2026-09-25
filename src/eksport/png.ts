const TABELL = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of data) c = TABELL[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const SIGNATUR_OG_IHDR = 8 + 4 + 4 + 13 + 4;

/**
 * Setter oppløsningen i PNG-fila (pHYs-blokk), slik at trykkeri og bildeprogram ser riktig DPI.
 * Eksisterende pHYs fjernes.
 */
export function settPngDpi(png: Uint8Array, dpi: number): Uint8Array {
  const visning = new DataView(png.buffer, png.byteOffset, png.byteLength);
  if (visning.getUint32(0) !== 0x89504e47) throw new Error('Ikke en PNG-fil');

  const biter: Uint8Array[] = [png.subarray(0, SIGNATUR_OG_IHDR)];
  const ppm = Math.round(dpi / 0.0254);
  const phys = new Uint8Array(4 + 4 + 9 + 4);
  const d = new DataView(phys.buffer);
  d.setUint32(0, 9);
  phys.set([0x70, 0x48, 0x59, 0x73], 4); // «pHYs»
  d.setUint32(8, ppm);
  d.setUint32(12, ppm);
  phys[16] = 1; // meter
  d.setUint32(17, crc32(phys.subarray(4, 17)));
  biter.push(phys);

  // Kopier resten, men hopp over gamle pHYs-blokker
  let i = SIGNATUR_OG_IHDR;
  while (i < png.length) {
    const lengde = visning.getUint32(i);
    const type = String.fromCharCode(...png.subarray(i + 4, i + 8));
    const slutt = i + 12 + lengde;
    if (type !== 'pHYs') biter.push(png.subarray(i, slutt));
    i = slutt;
  }

  const ut = new Uint8Array(biter.reduce((sum, b) => sum + b.length, 0));
  let pos = 0;
  for (const b of biter) {
    ut.set(b, pos);
    pos += b.length;
  }
  return ut;
}

export function lesPngDpi(png: Uint8Array): number | undefined {
  const visning = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let i = 8;
  while (i < png.length) {
    const lengde = visning.getUint32(i);
    const type = String.fromCharCode(...png.subarray(i + 4, i + 8));
    if (type === 'pHYs' && png[i + 16] === 1) return Math.round(visning.getUint32(i + 8) * 0.0254);
    i += 12 + lengde;
  }
  return undefined;
}
