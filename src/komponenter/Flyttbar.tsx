import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { festRamme, type Handtak } from '../geometri/rutenett';
import type { Rektangel } from '../modell/typer';
import { useSkilt } from '../store';
import { useEksport, useSkala } from './visning';

interface Props {
  ramme: Rektangel;
  valgt: boolean;
  onVelg(): void;
  onEndre(ramme: Rektangel): void;
  /** Dra i innholdet flytter rammen. Ellers flyttes den bare med håndtaket øverst. */
  flyttMedInnhold: boolean;
  etikett?: string;
  zIndeks?: number;
  children: ReactNode;
}

const MIN_MM = 20;

export function Flyttbar({
  ramme,
  valgt,
  onVelg,
  onEndre,
  flyttMedInnhold,
  etikett,
  zIndeks,
  children,
}: Props) {
  const skala = useSkala();
  const eksport = useEksport();
  const start = useRef<{ handtak: Handtak; x: number; y: number; ramme: Rektangel; fanget: boolean }>(
    undefined,
  );
  const boks = useRef<HTMLDivElement>(null);
  const sluttVent = useRef<() => void>(undefined);
  useEffect(() => () => sluttVent.current?.(), []);

  /**
   * @param fangNaa håndtakene er små, så de fanger pekeren med en gang – ellers kan første
   * bevegelse havne utenfor håndtaket og dra-operasjonen går tapt
   */
  const ned = (e: PointerEvent, handtak: Handtak, fangNaa = false) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onVelg();
    if (fangNaa) e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { handtak, x: e.clientX, y: e.clientY, ramme, fanget: fangNaa };
    if (!fangNaa) ventPaaBevegelse();
  };

  /**
   * Fang pekeren først når den faktisk flyttes, ellers når ikke klikk og dobbeltklikk fram til
   * innholdet. Fram til da lytter vinduet, så en rask første bevegelse ut av et lite element
   * (f.eks. en kompassrose) ikke går tapt.
   */
  const ventPaaBevegelse = () => {
    sluttVent.current?.();
    const bevegelse = (e: globalThis.PointerEvent) => {
      const s = start.current;
      if (!s || s.fanget) return slutt();
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < 3) return;
      boks.current?.setPointerCapture(e.pointerId);
      s.fanget = true;
      slutt();
      oppdater(e);
    };
    const slutt = () => {
      window.removeEventListener('pointermove', bevegelse);
      window.removeEventListener('pointerup', slutt);
      sluttVent.current = undefined;
    };
    window.addEventListener('pointermove', bevegelse);
    window.addEventListener('pointerup', slutt);
    sluttVent.current = slutt;
  };

  const flytt = (e: PointerEvent) => {
    if (start.current?.fanget) oppdater(e);
  };

  const oppdater = (e: Pick<PointerEvent, 'clientX' | 'clientY' | 'altKey'>) => {
    const s = start.current;
    if (!s) return;
    const dx = (e.clientX - s.x) / skala;
    const dy = (e.clientY - s.y) / skala;
    const r = { ...s.ramme };
    if (s.handtak === 'flytt') {
      r.x += dx;
      r.y += dy;
    } else {
      if (s.handtak.includes('v')) {
        const b = Math.max(MIN_MM, s.ramme.b - dx);
        r.x = s.ramme.x + s.ramme.b - b;
        r.b = b;
      } else r.b = Math.max(MIN_MM, s.ramme.b + dx);
      if (s.handtak.startsWith('n')) {
        const h = Math.max(MIN_MM, s.ramme.h - dy);
        r.y = s.ramme.y + s.ramme.h - h;
        r.h = h;
      } else r.h = Math.max(MIN_MM, s.ramme.h + dy);
    }
    // Alt holdt nede slår av rutenettet midlertidig
    const fest = useSkilt.getState().festTilRutenett && !e.altKey;
    onEndre(fest ? festRamme(r, s.handtak, MIN_MM) : r);
  };

  const opp = () => (start.current = undefined);
  const hendelser = { onPointerMove: flytt, onPointerUp: opp, onPointerCancel: opp };

  return (
    <div
      ref={boks}
      className="absolute"
      style={{
        zIndex: zIndeks,
        left: ramme.x * skala,
        top: ramme.y * skala,
        width: ramme.b * skala,
        height: ramme.h * skala,
      }}
      onPointerDown={(e) => {
        if (flyttMedInnhold) return ned(e, 'flytt');
        e.stopPropagation();
        onVelg();
      }}
      {...(flyttMedInnhold ? hendelser : {})}
    >
      {children}
      {valgt && !eksport && (
        <>
          <div className="pointer-events-none absolute -inset-[3px] rounded-sm border-2 border-sky-500" />
          {!flyttMedInnhold && (
            <div
              className="absolute -top-7 left-1/2 flex h-6 -translate-x-1/2 cursor-move items-center gap-1 rounded bg-sky-500 px-2 text-xs text-white shadow"
              onPointerDown={(e) => ned(e, 'flytt', true)}
              {...hendelser}
            >
              ✥ {etikett ?? 'Flytt'}
            </div>
          )}
          {(['nv', 'no', 'sv', 'so'] as const).map((h) => (
            <div
              key={h}
              className="absolute size-3 rounded-full border-2 border-sky-500 bg-white"
              style={{
                [h.startsWith('n') ? 'top' : 'bottom']: -7,
                [h.endsWith('v') ? 'left' : 'right']: -7,
                cursor: h === 'nv' || h === 'so' ? 'nwse-resize' : 'nesw-resize',
              }}
              onPointerDown={(e) => ned(e, h, true)}
              {...hendelser}
            />
          ))}
        </>
      )}
    </div>
  );
}
