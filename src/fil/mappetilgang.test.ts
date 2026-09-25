import { describe, expect, it } from 'vitest';
import { ledigSti } from './mappetilgang';

describe('ledigSti', () => {
  it('legger til nummer ved navnekollisjon', () => {
    expect(ledigSti([], '6 Pilgrimsleden', 'sti.jpg')).toBe('6 Pilgrimsleden/sti.jpg');
    expect(ledigSti(['a/sti.jpg', 'a/sti (2).jpg'], 'a', 'sti.jpg')).toBe('a/sti (3).jpg');
  });
});
