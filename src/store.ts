import { create } from 'zustand';
import { leggTilFil, ledigSti, type Filmappe } from './fil/mappetilgang';
import { nyttUtsnitt } from './modell/importerMappe';
import { angre, gjeldendeGest, gjorOm, registrer, tomHistorikk, type Historikk } from './modell/historikk';
import { DEKORTYPER } from './geometri/dekor';
import { festHeleRammen } from './geometri/rutenett';
import { flyttMellomKart, kalibreringFraGeo } from './geometri/geo';
import { lagOppsett, type Oppsettmal } from './modell/oppsett';
import { RUTEMALER } from './modell/rutestiler';
import type { ParsetTekst } from './modell/tekstParser';
import type {
  Bildepunkt,
  Bildeutsnitt,
  Card,
  Kart,
  Kartpunkt,
  Rektangel,
  Rute,
  Banner,
  Dekor,
  Dekortype,
  Georeferanse,
  Osmutsnitt,
  Skilt,
  Stedsnavn,
  Tema,
} from './modell/typer';

export type Valg =
  | { type: 'skilt' }
  | { type: 'kart' }
  | { type: 'card'; id: string }
  | { type: 'rute'; id: string }
  | { type: 'stedsnavn'; id: string }
  | { type: 'banner' }
  | { type: 'dekor'; id: string };
export type Modus =
  | { type: 'normal' }
  | { type: 'kalibrer'; punkter: Bildepunkt[] }
  | { type: 'plasser-punkt'; cardId: string }
  | { type: 'beskjaer'; cardId: string }
  | { type: 'tegn-rute'; ruteId: string }
  | { type: 'plasser-stedsnavn' };

export type Lagringsstatus =
  | { type: 'lagret'; tid: Date }
  | { type: 'endret' }
  | { type: 'lagrer' }
  | { type: 'feil'; melding: string };

interface Tilstand {
  /** Økes for hvert prosjekt som åpnes, så historikk og lagring vet når prosjektet byttes */
  prosjektId: number;
  historikk: Historikk<Skilt>;
  lagring?: Lagringsstatus;
  mappe?: Filmappe;
  skilt?: Skilt;
  valg: Valg;
  modus: Modus;
  /** Skjermpiksler per mm i editoren */
  visningsskala: number;
  /** Cards der teksten ikke får plass */
  tekstOverflyt: Record<string, boolean>;
  /** Rammer festes til rutenettet når de flyttes eller endrer størrelse */
  festTilRutenett: boolean;

  apneProsjekt(mappe: Filmappe, skilt: Skilt): void;
  angre(): void;
  gjorOm(): void;
  settLagring(status: Lagringsstatus): void;
  /** Oppdaterer tittel og tekst i cards med samme nummer som seksjonene */
  oppdaterTekster(tekst: ParsetTekst): number;

  endreBanner(patch: Partial<Banner>): void;
  endreTema(patch: Partial<Tema>): void;
  /** Plasserer banner, kart og cards etter en mal */
  brukOppsett(mal: Oppsettmal): void;
  leggTilDekor(type: Dekortype): string;
  endreDekor(id: string, patch: Partial<Dekor>): void;
  slettDekor(id: string): void;
  /** Trær øverst til venstre, bro øverst til høyre og gress langs bunnen, som i utkastet */
  leggTilUtkastDekor(): void;
  /**
   * Bytter kartbilde. Er både gammelt og nytt kart georeferert, flyttes punkter, veier og
   * stedsnavn så de står på samme sted i terrenget. Returnerer om de ble flyttet.
   */
  byttKartbilde(nytt: { fil: string; geo?: Georeferanse; osm?: Osmutsnitt; kildetekst?: string }): boolean;
  velg(valg: Valg): void;
  settModus(modus: Modus): void;
  settVisningsskala(skala: number): void;
  endreSkilt(endring: (s: Skilt) => Skilt): void;
  endreKart(patch: Partial<Kart>): void;
  endreCard(id: string, patch: Partial<Card>): void;
  /** Endrer alle cards, f.eks. tekststørrelse eller linjestil for hele skiltet */
  endreAlleCards(endring: (c: Card) => Partial<Card>): void;
  /** Sletter valgt vei, stedsnavn eller dekor. Returnerer om noe ble slettet. */
  slettValgt(): boolean;
  settFestTilRutenett(fest: boolean): void;
  /** Fester alle cards til rutenettet, så de står på linje */
  festCardsTilRutenett(): void;
  endreBilde(cardId: string, bilde: Bildeutsnitt): void;
  endreFormat(bredde_mm: number, hoyde_mm: number): void;
  settOverflyt(cardId: string, overflyt: boolean): void;
  /** Plasserer (eller flytter) kartpunktet som cardet lenker til */
  plasserPunkt(cardId: string, posisjon: Bildepunkt): void;
  flyttPunkt(punktId: string, posisjon: Bildepunkt): void;
  fjernLenke(cardId: string): void;
  /** Kopierer fila inn i cardets mappe og bruker den som bilde */
  leggTilBilde(cardId: string, fil: File): Promise<void>;
  /** Lagrer en fil i prosjektmappa (f.eks. et nytt kartbilde) */
  lagreFil(sti: string, fil: File): Promise<void>;

  /** Ny rute fra mal (indeks i RUTEMALER), starter tegning */
  nyRute(mal: number): string;
  leggTilRutepunkter(ruteId: string, punkter: Bildepunkt[]): void;
  settRutepunkter(ruteId: string, punkter: Bildepunkt[]): void;
  endreRute(ruteId: string, patch: Partial<Rute>): void;
  slettRute(ruteId: string): void;
  /** Avslutter tegning; ruter med under to punkter fjernes */
  avsluttTegning(): void;
  nyttStedsnavn(posisjon: Bildepunkt): string;
  endreStedsnavn(id: string, patch: Partial<Stedsnavn>): void;
  slettStedsnavn(id: string): void;
}

/** Minste card-størrelse, som når rammer dras (Flyttbar) */
const MIN_CARD_MM = 20;

/** Lys stein med mørke fuger, synlig mot papirbakgrunnen */
const STEINFARGE = '#ddd3bf';

let teller = 0;
/** Satt mens angre/gjør om endrer skiltet, så endringen ikke registreres som nytt steg */
let gjenoppretter = false;
const nyId = (prefiks: string) => `${prefiks}-${Date.now().toString(36)}-${teller++}`;

const skalerRamme = (r: Rektangel, sx: number, sy: number): Rektangel => ({
  x: r.x * sx,
  y: r.y * sy,
  b: r.b * sx,
  h: r.h * sy,
});

const erBildefil = (fil: File) => fil.type.startsWith('image/');

export const useSkilt = create<Tilstand>()((set, get) => {
  const endreCards = (fn: (cards: Card[], s: Skilt) => Partial<Skilt>) =>
    set((t) => (t.skilt ? { skilt: { ...t.skilt, ...fn(t.skilt.cards, t.skilt) } } : {}));
  const endreRuter = (fn: (r: Rute) => Rute) =>
    set((t) => (t.skilt ? { skilt: { ...t.skilt, ruter: t.skilt.ruter.map(fn) } } : {}));

  return {
    valg: { type: 'skilt' },
    modus: { type: 'normal' },
    visningsskala: 1,
    tekstOverflyt: {},
    festTilRutenett: false,
    prosjektId: 0,
    historikk: tomHistorikk(),

    apneProsjekt: (mappe, skilt) =>
      set((t) => ({
        mappe,
        skilt,
        valg: { type: 'skilt' },
        modus: { type: 'normal' },
        tekstOverflyt: {},
        prosjektId: t.prosjektId + 1,
        historikk: tomHistorikk(),
        lagring: undefined,
      })),
    angre: () => {
      const { skilt, historikk } = get();
      const r = skilt && angre(historikk, skilt);
      if (!r) return;
      gjenoppretter = true;
      set({ skilt: r.verdi, historikk: r.historikk, modus: { type: 'normal' } });
      gjenoppretter = false;
    },
    gjorOm: () => {
      const { skilt, historikk } = get();
      const r = skilt && gjorOm(historikk, skilt);
      if (!r) return;
      gjenoppretter = true;
      set({ skilt: r.verdi, historikk: r.historikk, modus: { type: 'normal' } });
      gjenoppretter = false;
    },
    settLagring: (lagring) => set({ lagring }),
    oppdaterTekster: (tekst) => {
      let antall = 0;
      endreCards((cards) => ({
        cards: cards.map((c) => {
          const seksjon = tekst.seksjoner.find((s) => s.nummer === c.nummer);
          if (!seksjon || (seksjon.tittel === c.tittel && seksjon.tekst === c.tekst)) return c;
          antall++;
          return { ...c, tittel: seksjon.tittel, tekst: seksjon.tekst };
        }),
      }));
      return antall;
    },
    velg: (valg) => {
      const m = get().modus;
      // Beskjæring og tegning avsluttes når noe annet velges
      const beholdModus =
        m.type === 'kalibrer' ||
        (m.type === 'beskjaer' && valg.type === 'card' && valg.id === m.cardId) ||
        (m.type === 'tegn-rute' && valg.type === 'rute' && valg.id === m.ruteId);
      if (!beholdModus) get().avsluttTegning();
      set({ valg, modus: beholdModus ? m : { type: 'normal' } });
    },
    settModus: (modus) => set({ modus }),
    settVisningsskala: (visningsskala) => set({ visningsskala: Math.min(8, Math.max(0.2, visningsskala)) }),
    endreSkilt: (endring) => set((t) => (t.skilt ? { skilt: endring(t.skilt) } : {})),
    endreKart: (patch) =>
      set((t) => (t.skilt ? { skilt: { ...t.skilt, kart: { ...t.skilt.kart, ...patch } } } : {})),
    endreCard: (id, patch) =>
      endreCards((cards) => ({ cards: cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    endreAlleCards: (endring) =>
      endreCards((cards) => ({ cards: cards.map((c) => ({ ...c, ...endring(c) })) })),
    slettValgt: () => {
      const { valg, modus } = get();
      if (modus.type !== 'normal') return false;
      if (valg.type === 'rute') get().slettRute(valg.id);
      else if (valg.type === 'stedsnavn') get().slettStedsnavn(valg.id);
      else if (valg.type === 'dekor') get().slettDekor(valg.id);
      else return false;
      return true;
    },
    settFestTilRutenett: (festTilRutenett) => set({ festTilRutenett }),
    festCardsTilRutenett: () =>
      get().endreAlleCards((c) => ({ ramme: festHeleRammen(c.ramme, MIN_CARD_MM) })),
    endreBilde: (cardId, bilde) => get().endreCard(cardId, { bilde }),
    endreFormat: (bredde_mm, hoyde_mm) =>
      set((t) => {
        if (!t.skilt) return {};
        const sx = bredde_mm / t.skilt.format.bredde_mm;
        const sy = hoyde_mm / t.skilt.format.hoyde_mm;
        return {
          skilt: {
            ...t.skilt,
            format: { ...t.skilt.format, bredde_mm, hoyde_mm },
            kart: { ...t.skilt.kart, ramme: skalerRamme(t.skilt.kart.ramme, sx, sy) },
            banner: { ...t.skilt.banner, ramme: skalerRamme(t.skilt.banner.ramme, sx, sy) },
            dekor: t.skilt.dekor.map((d) => ({ ...d, ramme: skalerRamme(d.ramme, sx, sy) })),
            cards: t.skilt.cards.map((c) => ({ ...c, ramme: skalerRamme(c.ramme, sx, sy) })),
          },
        };
      }),
    settOverflyt: (cardId, overflyt) =>
      set((t) =>
        t.tekstOverflyt[cardId] === overflyt
          ? {}
          : { tekstOverflyt: { ...t.tekstOverflyt, [cardId]: overflyt } },
      ),

    plasserPunkt: (cardId, posisjon) =>
      endreCards((cards, s) => {
        const card = cards.find((c) => c.id === cardId);
        if (!card) return {};
        const eksisterende = card.lenke && s.punkter.find((p) => p.id === card.lenke!.punktId);
        if (eksisterende) {
          return { punkter: s.punkter.map((p) => (p.id === eksisterende.id ? { ...p, posisjon } : p)) };
        }
        const punkt: Kartpunkt = { id: `punkt-${cardId}-${Date.now()}`, posisjon };
        return {
          punkter: [...s.punkter, punkt],
          cards: cards.map((c) =>
            c.id === cardId ? { ...c, lenke: { punktId: punkt.id, stil: c.lenke?.stil ?? 'knekt' } } : c,
          ),
        };
      }),
    flyttPunkt: (punktId, posisjon) =>
      endreCards((_, s) => ({ punkter: s.punkter.map((p) => (p.id === punktId ? { ...p, posisjon } : p)) })),
    fjernLenke: (cardId) =>
      endreCards((cards, s) => {
        const punktId = cards.find((c) => c.id === cardId)?.lenke?.punktId;
        const nyeCards = cards.map((c) => (c.id === cardId ? { ...c, lenke: undefined } : c));
        const iBruk = new Set(nyeCards.map((c) => c.lenke?.punktId));
        return { cards: nyeCards, punkter: s.punkter.filter((p) => p.id !== punktId || iBruk.has(p.id)) };
      }),

    lagreFil: async (sti, fil) => {
      const { mappe } = get();
      if (mappe) set({ mappe: await leggTilFil(mappe, sti, fil) });
    },
    leggTilBilde: async (cardId, fil) => {
      const { mappe, skilt } = get();
      const card = skilt?.cards.find((c) => c.id === cardId);
      if (!mappe || !card || !erBildefil(fil)) return;
      const kildemappe = card.kildemappe ?? `${card.nummer} ${card.tittel}`;
      const sti = ledigSti(mappe.filer, kildemappe, fil.name);
      set({ mappe: await leggTilFil(mappe, sti, fil) });
      get().endreCard(cardId, {
        kildemappe,
        bilde: { ...nyttUtsnitt(sti), kreditering: card.bilde?.kreditering },
      });
    },

    nyRute: (mal) => {
      const { navn, stil } = RUTEMALER[mal] ?? RUTEMALER[0]!;
      const id = nyId('rute');
      const rute: Rute = {
        id,
        navn,
        punkter: [],
        glattet: true,
        stil: { ...stil },
        visITegnforklaring: true,
      };
      set((t) =>
        t.skilt
          ? {
              skilt: { ...t.skilt, ruter: [...t.skilt.ruter, rute] },
              valg: { type: 'rute', id },
              modus: { type: 'tegn-rute', ruteId: id },
            }
          : {},
      );
      return id;
    },
    leggTilRutepunkter: (ruteId, punkter) =>
      endreRuter((r) => (r.id === ruteId ? { ...r, punkter: [...r.punkter, ...punkter] } : r)),
    settRutepunkter: (ruteId, punkter) => endreRuter((r) => (r.id === ruteId ? { ...r, punkter } : r)),
    endreRute: (ruteId, patch) => endreRuter((r) => (r.id === ruteId ? { ...r, ...patch } : r)),
    slettRute: (ruteId) =>
      set((t) =>
        t.skilt
          ? {
              skilt: { ...t.skilt, ruter: t.skilt.ruter.filter((r) => r.id !== ruteId) },
              valg: t.valg.type === 'rute' && t.valg.id === ruteId ? { type: 'kart' } : t.valg,
              modus: t.modus.type === 'tegn-rute' && t.modus.ruteId === ruteId ? { type: 'normal' } : t.modus,
            }
          : {},
      ),
    avsluttTegning: () => {
      const { modus, skilt } = get();
      if (modus.type !== 'tegn-rute') return;
      set({ modus: { type: 'normal' } });
      const rute = skilt?.ruter.find((r) => r.id === modus.ruteId);
      if (rute && rute.punkter.length < 2) get().slettRute(rute.id);
    },
    nyttStedsnavn: (posisjon) => {
      const id = nyId('sted');
      const sted: Stedsnavn = {
        id,
        tekst: 'Nytt sted',
        posisjon,
        storrelse: 'm',
        kursiv: false,
        farge: '#1f2a24',
        rotasjon: 0,
      };
      set((t) =>
        t.skilt
          ? {
              skilt: { ...t.skilt, stedsnavn: [...t.skilt.stedsnavn, sted] },
              valg: { type: 'stedsnavn', id },
              modus: { type: 'normal' },
            }
          : {},
      );
      return id;
    },
    endreStedsnavn: (id, patch) =>
      set((t) =>
        t.skilt
          ? {
              skilt: {
                ...t.skilt,
                stedsnavn: t.skilt.stedsnavn.map((s) => (s.id === id ? { ...s, ...patch } : s)),
              },
            }
          : {},
      ),
    slettStedsnavn: (id) =>
      set((t) =>
        t.skilt
          ? {
              skilt: { ...t.skilt, stedsnavn: t.skilt.stedsnavn.filter((s) => s.id !== id) },
              valg: t.valg.type === 'stedsnavn' && t.valg.id === id ? { type: 'kart' } : t.valg,
            }
          : {},
      ),

    endreBanner: (patch) => get().endreSkilt((sk) => ({ ...sk, banner: { ...sk.banner, ...patch } })),
    endreTema: (patch) => get().endreSkilt((sk) => ({ ...sk, tema: { ...sk.tema, ...patch } })),
    brukOppsett: (mal) =>
      get().endreSkilt((sk) => {
        const o = lagOppsett(mal, sk.format, sk.cards.length);
        const rekkefolge = [...sk.cards].sort((a, b) => a.nummer - b.nummer).map((c) => c.id);
        return {
          ...sk,
          banner: { ...sk.banner, ramme: o.banner },
          kart: { ...sk.kart, ramme: o.kart },
          cards: sk.cards.map((c) => ({ ...c, ramme: o.cards[rekkefolge.indexOf(c.id)]! })),
        };
      }),
    leggTilDekor: (type) => {
      const id = nyId('dekor');
      const sk = get().skilt;
      if (!sk) return id;
      const u = Math.min(sk.format.bredde_mm, sk.format.hoyde_mm) / 594;
      const { standard } = DEKORTYPER.find((d) => d.type === type)!;
      const b = standard.b * u;
      const h = standard.h * u;
      const dekor: Dekor = {
        id,
        type,
        ramme: { x: (sk.format.bredde_mm - b) / 2, y: (sk.format.hoyde_mm - h) / 2, b, h },
        farge: type === 'steinbro' ? STEINFARGE : '#2f5a3c',
        farge2: type === 'steinbro' ? '#2f5a3c' : undefined,
        speilvendt: false,
        fro: Math.floor(Math.random() * 1e6),
      };
      get().endreSkilt((s2) => ({ ...s2, dekor: [...s2.dekor, dekor] }));
      set({ valg: { type: 'dekor', id }, modus: { type: 'normal' } });
      return id;
    },
    endreDekor: (id, patch) =>
      get().endreSkilt((sk) => ({
        ...sk,
        dekor: sk.dekor.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      })),
    slettDekor: (id) => {
      get().endreSkilt((sk) => ({ ...sk, dekor: sk.dekor.filter((d) => d.id !== id) }));
      const v = get().valg;
      if (v.type === 'dekor' && v.id === id) set({ valg: { type: 'skilt' } });
    },
    leggTilUtkastDekor: () =>
      get().endreSkilt((sk) => {
        const { bredde_mm: B, hoyde_mm: H } = sk.format;
        const u = Math.min(B, H) / 594;
        const gronn = '#2f5a3c';
        const lag = (type: Dekortype, ramme: Dekor['ramme'], farge = gronn, speilvendt = false): Dekor => ({
          id: nyId('dekor'),
          type,
          ramme,
          farge,
          farge2: type === 'steinbro' ? gronn : undefined,
          speilvendt,
          fro: Math.floor(Math.random() * 1e6),
        });
        const venstreKant = sk.banner.ramme.x - 4 * u;
        return {
          ...sk,
          dekor: [
            ...sk.dekor,
            lag('granskog', { x: 4 * u, y: 4 * u, b: venstreKant - 4 * u, h: 62 * u }),
            lag(
              'steinbro',
              { x: B - venstreKant + 12 * u, y: 12 * u, b: venstreKant - 20 * u, h: 52 * u },
              STEINFARGE,
            ),
            lag('gress', { x: 0, y: H - 20 * u, b: B * 0.4, h: 20 * u }),
            lag('gress', { x: B * 0.6, y: H - 20 * u, b: B * 0.4, h: 20 * u }, gronn, true),
          ],
        };
      }),

    byttKartbilde: ({ fil, geo, osm, kildetekst }) => {
      const sk = get().skilt;
      if (!sk) return false;
      const gammel = sk.kart.geo;
      const flytt = gammel && geo ? (p: Bildepunkt) => flyttMellomKart(gammel, geo, p) : undefined;
      const sammeFil = sk.kart.bilde?.fil === fil;
      get().endreSkilt((s2) => ({
        ...s2,
        kart: {
          ...s2.kart,
          bilde: nyttUtsnitt(fil),
          geo,
          osm,
          kildetekst,
          // Nytt bilde uten georeferanse har ukjent målestokk
          kalibrering: geo ? kalibreringFraGeo(geo) : sammeFil ? s2.kart.kalibrering : undefined,
          nordRotasjon: geo ? 0 : s2.kart.nordRotasjon,
        },
        ...(flytt && {
          punkter: s2.punkter.map((p) => ({ ...p, posisjon: flytt(p.posisjon) })),
          ruter: s2.ruter.map((r) => ({ ...r, punkter: r.punkter.map(flytt), via: r.via?.map(flytt) })),
          stedsnavn: s2.stedsnavn.map((st) => ({ ...st, posisjon: flytt(st.posisjon) })),
        }),
      }));
      return flytt !== undefined;
    },
  };
});

// Historikk: hver endring av skiltet (unntatt angre/gjør om og prosjektbytte) blir et angresteg
useSkilt.subscribe((t, forrige) => {
  if (gjenoppretter || t.skilt === forrige.skilt || !forrige.skilt || t.prosjektId !== forrige.prosjektId)
    return;
  useSkilt.setState({ historikk: registrer(t.historikk, forrige.skilt, performance.now(), gjeldendeGest()) });
});
