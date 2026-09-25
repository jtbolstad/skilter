import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import {
  panorer,
  plasser,
  rammeTilBildepunkt,
  zoomRundt,
  type Plassering,
  type Storrelse,
} from '../geometri/utsnitt';
import type { Bildepunkt, Bildeutsnitt } from '../modell/typer';
import { useSkilt } from '../store';
import { useForhandsvisning } from './useForhandsvisning';

interface Props {
  utsnitt: Bildeutsnitt;
  /** Rammens størrelse i mm */
  ramme: Storrelse;
  /** Scroll zoomer og dra panorerer */
  interaktiv: boolean;
  onEndre?(utsnitt: Bildeutsnitt): void;
  onKlikk?(punkt: Bildepunkt): void;
  /** Overlegg tegnet i rammens mm-koordinater */
  overlegg?(p: Plassering, bilde: Storrelse): ReactNode;
  className?: string;
}

const KLIKK_TOLERANSE_PX = 4;

export function Bildevisning({ utsnitt, ramme, interaktiv, onEndre, onKlikk, overlegg, className }: Props) {
  const skala = useSkilt((t) => t.visningsskala);
  const f = useForhandsvisning(utsnitt.fil);
  const flate = useRef<HTMLDivElement>(null);
  const dra = useRef<{ x: number; y: number; flyttet: boolean }>(undefined);
  const bilde = f ? { b: f.bredde, h: f.hoyde } : undefined;
  const lastet = f !== undefined;

  // Hjul må registreres som ikke-passiv for å kunne stoppe sidescroll
  const siste = useRef({ utsnitt, ramme, bilde, skala, onEndre });
  useLayoutEffect(() => {
    siste.current = { utsnitt, ramme, bilde, skala, onEndre };
  });
  useEffect(() => {
    const el = flate.current;
    if (!el || !interaktiv) return;
    const hjul = (e: WheelEvent) => {
      const s = siste.current;
      if (!s.bilde || !s.onEndre || e.ctrlKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const faktor = Math.exp(-e.deltaY * 0.0015);
      s.onEndre(
        zoomRundt(
          s.utsnitt,
          faktor,
          (e.clientX - r.left) / s.skala,
          (e.clientY - r.top) / s.skala,
          s.ramme,
          s.bilde,
        ),
      );
    };
    el.addEventListener('wheel', hjul, { passive: false });
    return () => el.removeEventListener('wheel', hjul);
  }, [interaktiv, lastet]);

  if (!f || !bilde) {
    return <div className={`size-full animate-pulse bg-stone-200 ${className ?? ''}`} />;
  }

  const p = plasser(utsnitt, ramme, bilde);

  return (
    <div
      ref={flate}
      className={`relative size-full overflow-hidden ${interaktiv ? 'cursor-grab active:cursor-grabbing' : ''} ${className ?? ''}`}
      onPointerDown={(e) => {
        if (!interaktiv || e.button !== 0) return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        dra.current = { x: e.clientX, y: e.clientY, flyttet: false };
      }}
      onPointerMove={(e) => {
        const d = dra.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.flyttet && Math.hypot(dx, dy) < KLIKK_TOLERANSE_PX) return;
        d.flyttet = true;
        d.x = e.clientX;
        d.y = e.clientY;
        onEndre?.(panorer(utsnitt, dx / skala, dy / skala, ramme, bilde));
      }}
      onPointerUp={(e) => {
        const d = dra.current;
        dra.current = undefined;
        if (!d || d.flyttet || !onKlikk) return;
        const r = e.currentTarget.getBoundingClientRect();
        onKlikk(rammeTilBildepunkt((e.clientX - r.left) / skala, (e.clientY - r.top) / skala, p));
      }}
    >
      <img
        src={f.url}
        alt=""
        draggable={false}
        className="absolute max-w-none select-none"
        style={{
          left: p.venstre * skala,
          top: p.topp * skala,
          width: p.bredde * skala,
          height: p.hoyde * skala,
        }}
      />
      {overlegg?.(p, bilde)}
    </div>
  );
}
