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
import { MAKS_SIDE } from '../fil/forhandsvisning';
import { useOriginalUrl, useForhandsvisning } from './useForhandsvisning';
import { useVisning } from './visning';

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
  /** Vis delen av bildet som er utenfor ramma, halvgjennomsiktig (beskjæringsmodus) */
  visUtenfor?: boolean;
  className?: string;
}

const KLIKK_TOLERANSE_PX = 4;

export function Bildevisning({
  utsnitt,
  ramme,
  interaktiv,
  onEndre,
  onKlikk,
  overlegg,
  visUtenfor,
  className,
}: Props) {
  const { skala, eksport, dpi } = useVisning();
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

  const p = bilde && plasser(utsnitt, ramme, bilde);
  // Ved eksport: bruk originalen når forhåndsvisningen er for liten for trykkoppløsningen
  const trengerPiksler = p && dpi ? (Math.max(p.bredde, p.hoyde) / 25.4) * dpi : 0;
  const brukOriginal =
    eksport && bilde !== undefined && (Math.max(bilde.b, bilde.h) <= MAKS_SIDE || trengerPiksler > MAKS_SIDE);
  const original = useOriginalUrl(brukOriginal ? utsnitt.fil : undefined);
  const url = brukOriginal ? original : f?.url;

  if (!f || !bilde || !p || !url) {
    return <div data-laster className={`size-full animate-pulse bg-stone-200 ${className ?? ''}`} />;
  }

  const lag = (ekstra: string) => (
    <div
      className={`absolute ${ekstra}`}
      style={{
        left: p.venstre * skala,
        top: p.topp * skala,
        width: p.bredde * skala,
        height: p.hoyde * skala,
        // Roter rundt rammens sentrum
        transformOrigin: `${(ramme.b / 2 - p.venstre) * skala}px ${(ramme.h / 2 - p.topp) * skala}px`,
        rotate: `${p.rotasjon}deg`,
      }}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        className="size-full max-w-none select-none"
        style={{ scale: p.speilvendt ? '-1 1' : undefined }}
      />
    </div>
  );

  return (
    <div
      ref={flate}
      className={`relative size-full ${interaktiv ? 'cursor-grab active:cursor-grabbing' : ''} ${className ?? ''}`}
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
      {visUtenfor && lag('pointer-events-none opacity-35')}
      <div className="absolute inset-0 overflow-hidden">
        {lag('')}
        {overlegg?.(p, bilde)}
      </div>
      {visUtenfor && (
        <div className="pointer-events-none absolute inset-0 outline-2 outline-white outline-dashed" />
      )}
    </div>
  );
}
