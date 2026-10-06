import { describe, expect, it } from 'vitest';
import { cmTilMm, formaterCm, lesCm, MAKS_FORMAT_CM, MIN_FORMAT_CM } from './format';

describe('lesCm', () => {
  it('leser heltall og desimaler med komma eller punktum', () => {
    expect(lesCm('84')).toBe(84);
    expect(lesCm('84,1')).toBe(84.1);
    expect(lesCm('84.1')).toBe(84.1);
    expect(lesCm(' 59,45 ')).toBe(59.45);
  });

  it('avviser tomt, tekst og flere desimalskilletegn', () => {
    for (const t of ['', ' ', 'abc', '84,', ',5', '8,4,1', '-20', '1e2', '84 cm']) {
      expect(lesCm(t), t).toBeUndefined();
    }
  });

  it('avviser mål utenfor grensene', () => {
    expect(lesCm(String(MIN_FORMAT_CM))).toBe(MIN_FORMAT_CM);
    expect(lesCm(String(MAKS_FORMAT_CM))).toBe(MAKS_FORMAT_CM);
    expect(lesCm('4,9')).toBeUndefined();
    expect(lesCm('1000,1')).toBeUndefined();
    expect(lesCm('0')).toBeUndefined();
  });
});

describe('cmTilMm og formaterCm', () => {
  it('regner om uten flyttallsstøy', () => {
    expect(cmTilMm(84.1)).toBe(841);
    expect(cmTilMm(59.4)).toBe(594);
    expect(cmTilMm(29.7)).toBe(297);
    expect(cmTilMm(10.5)).toBe(105);
  });

  it('viser mm som cm med komma uten bakerste nuller', () => {
    expect(formaterCm(841)).toBe('84,1');
    expect(formaterCm(594)).toBe('59,4');
    expect(formaterCm(600)).toBe('60');
    expect(formaterCm(1234.5)).toBe('123,45');
  });

  it('gir samme mål tilbake', () => {
    for (const mm of [841, 594, 297, 123.4, 1000]) {
      expect(cmTilMm(lesCm(formaterCm(mm))!)).toBe(mm);
    }
  });
});
