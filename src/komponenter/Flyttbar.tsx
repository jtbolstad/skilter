import { useRef, type PointerEvent, type ReactNode } from 'react';
import type { Rektangel } from '../modell/typer';
import { useSkilt } from '../store';

type Handtak = 'flytt' | 'nv' | 'no' | 'sv' | 'so';

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
  const skala = useSkilt((t) => t.visningsskala);
  const start = useRef<{ handtak: Handtak; x: number; y: number; ramme: Rektangel; fanget: boolean }>(
    undefined,
  );

  const ned = (e: PointerEvent, handtak: Handtak) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onVelg();
    start.current = { handtak, x: e.clientX, y: e.clientY, ramme, fanget: false };
  };

  const flytt = (e: PointerEvent) => {
    const s = start.current;
    if (!s) return;
    // Fang pekeren først når den faktisk flyttes, ellers når ikke klikk/dobbelklikk fram til innholdet
    if (!s.fanget) {
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < 3) return;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      s.fanget = true;
    }
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
    onEndre(r);
  };

  const opp = () => (start.current = undefined);
  const hendelser = { onPointerMove: flytt, onPointerUp: opp, onPointerCancel: opp };

  return (
    <div
      className="absolute"
      style={{
        zIndex: zIndeks,
        left: ramme.x * skala,
        top: ramme.y * skala,
        width: ramme.b * skala,
        height: ramme.h * skala,
      }}
      onPointerDown={(e) => (flyttMedInnhold ? ned(e, 'flytt') : (e.stopPropagation(), onVelg()))}
      {...(flyttMedInnhold ? hendelser : {})}
    >
      {children}
      {valgt && (
        <>
          <div className="pointer-events-none absolute -inset-[3px] rounded-sm border-2 border-sky-500" />
          {!flyttMedInnhold && (
            <div
              className="absolute -top-7 left-1/2 flex h-6 -translate-x-1/2 cursor-move items-center gap-1 rounded bg-sky-500 px-2 text-xs text-white shadow"
              onPointerDown={(e) => ned(e, 'flytt')}
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
              onPointerDown={(e) => ned(e, h)}
              {...hendelser}
            />
          ))}
        </>
      )}
    </div>
  );
}
