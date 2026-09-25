# Skilter – plan for skiltgenerator

App for å lage informasjonsskilt som «Et historisk kulturlandskap – Hauketo · Prinsdal»:
tittel-banner, kart i midten, cards (tittel, bilde, tekst) rundt, lenkelinjer
fra card til punkt på kartet, inntegnede veier/leder med tegnforklaring, målestokk og nordpil.
Resultat eksporteres i trykkvennlig oppløsning (PDF/PNG, f.eks. A1/A0).

---

## 1. Kjernefunksjoner

| #   | Funksjon              | Beskrivelse                                                                                                                                                                                    |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Skiltlerret           | Fast format (A0–A3/egendefinert, liggende/stående), bakgrunnsfarge/tekstur, dekor (trær, bro, gress) som SVG-lag                                                                               |
| F2  | Tittel-banner         | Hovedtittel + undertittel (steder separert med «•»), fonter og farger                                                                                                                          |
| F3  | Kart                  | To moduser: **bildekart** (eget bilde, f.eks. `Kart.png` – standard) og **nettkart** (Kartverket topo / OSM via MapLibre, fase 6). Bildekart kan zoomes/panoreres i kartrammen som card-bilder |
| F4  | Kartpunkter           | Plasser markør (farge, ikon, nummer) med klikk; lagres som bildekoordinat (0–1) eller lng/lat; stedsnavn-labels                                                                                |
| F5  | Cards                 | Tittel, bilde, brødtekst (enkel rik tekst: kursiv/fet), rammefarge; dra/plasser fritt eller i spalter venstre/høyre                                                                            |
| F5b | Bilderedigering       | Bytt, skaler, beskjær – ikke-destruktivt, se § 1.1                                                                                                                                             |
| F6  | Lenkelinjer           | Linje fra card-kant til kartpunkt, farge = card-farge, rett/knekt/kurvet, automatisk ankerpunkt nærmest punktet                                                                                |
| F7  | Veier/ruter           | Tegn polylinjer på kartet (klikk-for-klikk eller frihånd), stil: farge, bredde, stiplet/dobbel-strek (f.eks. rød/gul stiplet pilegrimsled, brun kongevei)                                      |
| F8  | Snap til vei/sti (v2) | Rute følger eksisterende vei/sti via OSM-ruting (kun nettkart)                                                                                                                                 |
| F9  | Tegnforklaring        | Autogenereres fra rutene som har «vis i tegnforklaring»                                                                                                                                        |
| F10 | Målestokk + nordpil   | Bildekart: kalibrer ved å klikke to punkter og oppgi avstand. Nettkart: beregnes fra zoom                                                                                                      |
| F11 | Eksport               | PDF (vektor der mulig) og PNG i 150/300 DPI                                                                                                                                                    |
| F12 | Lagring               | Prosjekt lagres som `skilt.json` i prosjektmappa (File System Access API); bilder refereres med relativ sti                                                                                    |
| F13 | Mappe-import          | Åpne mappe → lag cards fra `N Navn/`-mapper + `tekst.txt`; bildene i mappa blir bildevalg for cardet                                                                                           |
| F14 | Kreditering           | Forfatterlinje («Skrevet av …»), fotokreditering per bilde, kartkilde                                                                                                                          |

### 1.1 Bilder: bytt, skaler, beskjær

Bilderamma i cardet har fast størrelse (bestemt av card-layout). Bildet ligger under og justeres fritt:

- **Bytt:** Klikk bilde → bildevelger med miniatyrer fra cardets mappe først (f.eks. `4 steinhvelvbroa (Lja bru)/` har 14 bilder), deretter resten av prosjektet, eller «Last opp». Dra-og-slipp fra Utforsker rett på cardet virker også.
- **Skaler:** Scrollhjul / glidebryter zoomer bildet i ramma (min = akkurat fyller ramma, aldri tomrom).
- **Beskjær/panorer:** Dobbelklikk bilde → beskjæringsmodus direkte på skiltet: dra for å flytte utsnitt; delen utenfor ramma vises halvgjennomsiktig.
- **Bilderamme:** Dra skillelinja mellom bilde og tekst for å endre bildehøyde; aspekt-forhåndsvalg (3:2, 16:9, 4:3, 1:1, fri).
- **Tilpass:** «Fyll» (cover) og «Vis hele» (contain med bakgrunnsfarge). «Tilbakestill» nullstiller zoom/pan.
- **Roter / speilvend:** 90°-steg + fin rotasjon ±10° (rette opp horisont).
- **Juster (v2):** Lysstyrke, kontrast, metning – CSS-filter i editor, samme filter ved eksport.
- **Ikke-destruktivt:** Originalfila røres aldri. Lagres som `{ fil, sentrumX, sentrumY, zoom, rotasjon }` – endres ramme-aspektet, holdes sentrum.
- **Oppløsningsvarsel:** Effektiv DPI = synlige kildepiksler / rammebredde i tommer. Gult < 200 DPI, rødt < 120 DPI.
- **Ytelse:** Mobilbildene er ca. 10 MB hver (mappa er 344 MB totalt). Forhåndsvisning (maks 2000 px WebP) lages med `createImageBitmap` i Web Worker og caches i IndexedDB. Original brukes kun ved eksport. JPG/PNG/WebP/AVIF støttes.

Samme bildeutsnitt-komponent brukes for kartbildet i kartrammen.

---

## 2. Teknologivalg

| Lag                     | Valg                                                                                                                             | Begrunnelse                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Frontend                | React + TypeScript + Vite                                                                                                        | Kjent stack                                     |
| Editor-UI               | shadcn/ui + Tailwind                                                                                                             | Lett, ingen Punkt-krav                          |
| Kart (bildekart)        | `<img>` i bildeutsnitt-komponent + SVG-overlay for punkter/ruter i normaliserte koordinater (0–1)                                | Enkelt, identisk resultat ved eksport           |
| Kart (nettkart, fase 6) | MapLibre GL JS + Kartverket `cache.kartverket.no`                                                                                | Norsk topo, `map.project()` for piksel-posisjon |
| Tegning av veier        | Egen SVG-polylinje-editor (bildekart); Terra Draw (nettkart)                                                                     | Noder, frihånd, utjevning med Catmull-Rom-kurve |
| Ruting (v2)             | BRouter / GraphHopper API                                                                                                        | Snap til sti og vei                             |
| Skiltlerret             | Én fast-størrelse `<div>` i mm, skalert med CSS `transform` i editor                                                             | WYSIWYG, samme layout ved eksport               |
| Lenkelinjer             | SVG-overlay over hele lerretet                                                                                                   | Linjer mellom card-anker og kartpunkt           |
| Drag/resize             | `react-moveable`                                                                                                                 | Flytt/skaler cards og kartramme                 |
| Rik tekst               | TipTap (minimal: fet, kursiv)                                                                                                    | Lagres som JSON                                 |
| Bildebeskjæring         | Egen komponent (CSS `transform` på `<img>` i `overflow:hidden`-ramme)                                                            | Redigering direkte på skiltet, ikke i dialog    |
| Bildebehandling         | Web Worker + `createImageBitmap` + `OffscreenCanvas`                                                                             | Forhåndsvisninger uten å fryse UI               |
| State                   | Zustand + `zundo` (angre/gjør om)                                                                                                | Enkel, undo gratis                              |
| Lagring                 | File System Access API (`showDirectoryPicker`) – les/skriv i prosjektmappa; IndexedDB for mappe-handle og forhåndsvisnings-cache | Mappa ligger i Dropbox → backup gratis          |
| Eksport                 | Offscreen-render i full oppløsning → PNG via canvas, PDF via `pdf-lib`                                                           | Se risiko § 7                                   |

Ingen backend. Én bruker, lokalt, kun PC (Chrome/Edge).

---

## 3. Datamodell

```ts
type Koordinat =
  | { type: 'bilde'; x: number; y: number } // 0–1 relativt kartbildet
  | { type: 'geo'; lng: number; lat: number };

interface Bildeutsnitt {
  fil: string; // relativ sti, f.eks. '8 Hauketo gård/hauketogård.png'
  sentrumX: number; // 0–1, punkt i bildet som ligger midt i ramma
  sentrumY: number;
  zoom: number; // 1 = akkurat fyller ramma
  rotasjon: number; // grader
  speilvendt?: boolean;
  tilpass: 'fyll' | 'vis-hele';
  kreditering?: string; // «Foto: …»
}

interface Skilt {
  id: string;
  navn: string;
  format: { bredde_mm: number; hoyde_mm: number; dpi: 150 | 300 };
  tema: { bakgrunn: string; font_tittel: string; font_tekst: string; dekor: string[] };
  banner: { tittel: string; undertittel: string[]; farge: string };
  forfatter?: string; // «Skrevet av Marius Park Pedersen, lokalhistoriker»
  kart: {
    ramme: Rektangel; // posisjon på lerretet (mm)
    kilde:
      | { type: 'bilde'; bilde: Bildeutsnitt; kalibrering?: { a: Koordinat; b: Koordinat; meter: number } }
      | {
          type: 'nett';
          senter: Koordinat;
          zoom: number;
          rotasjon: number;
          grunnkart: 'kartverket-topo' | 'kartverket-grå' | 'osm';
        };
    visMalestokk: boolean;
    visNordpil: boolean;
    nordRotasjon: number; // grader, for bildekart som ikke er nordvendt
  };
  punkter: Kartpunkt[];
  cards: Card[];
  ruter: Rute[];
  stedsnavn: Stedsnavn[];
}

interface Kartpunkt {
  id: string;
  posisjon: Koordinat;
  farge: string;
  ikon?: string;
}

interface Card {
  id: string;
  ramme: Rektangel; // mm på lerretet
  tittel: string;
  bilde?: Bildeutsnitt;
  bildeAndel: number; // bildehøyde som andel av card (0–1)
  bildeAspekt?: '3:2' | '16:9' | '4:3' | '1:1' | 'fri';
  kildemappe?: string; // '4 steinhvelvbroa (Lja bru)' – vises først i bildevelger
  tekst: string; // TipTap-JSON
  farge: string; // ramme + lenkelinje
  layout: 'bilde-over' | 'bilde-venstre';
  lenke?: { punktId: string; stil: 'rett' | 'knekt' | 'kurve'; anker: 'auto' | Side };
}

interface Rute {
  id: string;
  navn: string; // «Pilegrimsleden»
  geometri: Koordinat[];
  glattet: boolean;
  stil: { farge: string; farge2?: string; bredde: number; strek: 'hel' | 'stiplet' | 'prikket' | 'dobbel' };
  visITegnforklaring: boolean;
}

interface Stedsnavn {
  id: string;
  tekst: string;
  posisjon: Koordinat;
  storrelse: 's' | 'm' | 'l';
}
interface Rektangel {
  x: number;
  y: number;
  b: number;
  h: number;
}
type Side = 'topp' | 'hoyre' | 'bunn' | 'venstre';
```

Kartpunkt skilt fra Card: ett punkt kan ha flere cards, og punkt uten card er mulig.

**Mappe-import (`tekst.txt`):** Første linje = tittel. Linjer `N. Navn` starter ny seksjon; tekst til neste seksjon = brødtekst. Linje som starter med «Skrevet av» = forfatter. Seksjon N kobles til mappa som starter med `N ` (f.eks. `4 steinhvelvbroa (Lja bru)`). Første bilde i mappa settes som standard.

---

## 4. Arkitektur (komponenter)

```
App
├── Verktoylinje         (åpne mappe, lagre, angre, eksport, format)
├── Sidepanel
│   ├── LagListe         (banner, kart, cards, ruter, punkter, stedsnavn)
│   ├── Egenskaper       (redigering av valgt element)
│   └── Bildevelger      (miniatyrer fra prosjektmappa)
└── Lerret (skalert)
    ├── Bakgrunn + Dekor (SVG)
    ├── Banner
    ├── KartRamme        (Bildeutsnitt + SVG: punkter, ruter, stedsnavn)
    │   └── Malestokk, Nordpil, Tegnforklaring
    ├── Card[]           (draggable/resizable, inneholder Bildeutsnitt)
    ├── Kreditering      (forfatter, foto, kart)
    └── LenkeOverlay     (SVG, over alt)
```

**Lenkelinje-logikk**

1. Kartpunkt (0–1 i kartbildet) → gjennom kartbildets utsnitt (sentrum/zoom) → posisjon i kartramme → + rammens offset → lerret-koordinat (mm).
2. Card-anker: nærmeste kant-midtpunkt (eller hjørne) mot punktet.
3. Tegn `<path>`; oppdater ved zoom/pan av kart, card-drag og resize.
4. Linja klippes ikke – går over kart og marg som i eksemplet. Punkt utenfor synlig kartutsnitt → advarsel i panel.

**Veitegning-flyt**

1. Velg «Ny rute» → tegnemodus.
2. Klikk noder / hold Shift for frihånd; dobbelklikk eller Enter avslutter.
3. Rediger noder etterpå (dra, Delete sletter, klikk på linje setter inn node).
4. Stil velges i panel; SVG `stroke-dasharray`. Dobbel stil (rød/gul) = to linjer oppå hverandre.
5. «Glatt ut» gjør noder om til myk kurve.
6. (v2, kun nettkart) «Følg sti»: send nodene til ruting-API, erstatt geometri.

---

## 5. Faser

**Status 2026-09-25:** Fase 0–5 ferdig, nettkart-modus fra fase 6 (6a–6d) ferdig. Tester: `pnpm test` (151 unit), `pnpm test:e2e` (22 E2E + 6 som krever miljøvariabler, Playwright med installert Chrome).
Eksport: PDF via nettleserens utskrift (`@page` = skiltets størrelse, vektortekst, innebygde fonter); PNG via modern-screenshot med pHYs-DPI. PNG sperres over 150 MP (A0 @ 300 DPI) – bruk PDF der.
Avvik fra plan: tekstmarkering er `*kursiv*` / `**fet**` i tekstfelt i stedet for TipTap. Rotasjon støttes fullt (90°-steg + ±10° finjustering) med garantert fylt ramme.
Dev: `pnpm dev` → http://localhost:5330 (`?demo` laster prosjektmappa – mappa over `app/` – uten mappevelger).

### Fase 0 – Oppsett (Opus: ~15–30 min)

- Vite + React + TS, ESLint/Prettier, Vitest, Playwright.
- Zustand-store med datamodell.

### Fase 1 – Mappe + lerret + kart (Opus: ~1–2 t)

- Åpne prosjektmappe, les `tekst.txt` + bildemapper → 8 cards (Hauketo-prosjektet = testdata).
- Forhåndsvisnings-pipeline i Web Worker.
- Skalert lerret i mm, formatvalg.
- Bildekart (`Kart.png`) i kartramme, flytt/skaler ramme, zoom/panorer kartbildet.
- Målestokk (kalibrering) + nordpil.

### Fase 2 – Cards + bilder + punkter + lenker (Opus: ~2–3 t) → **MVP-kjerne**

- Rediger card (tittel, tekst, farge, layout).
- Bilderedigering § 1.1: bytt via bildevelger/dra-og-slipp, zoom, panorer, bilderamme-høyde, aspekt, rotasjon, DPI-varsel.
- Plasser kartpunkt ved klikk i kart; koble card ↔ punkt.
- SVG-lenkelinjer som følger kart og cards live.

### Fase 3 – Veier (Opus: ~1–1,5 t)

- SVG-rute-editor på bildekart, stiler, utjevning, tegnforklaring.
- Stedsnavn-labels på kart.

### Fase 4 – Lagring + eksport (Opus: ~1,5–2,5 t)

- Autosave `skilt.json` til prosjektmappa, angre/gjør om.
- PNG + PDF i 150/300 DPI med originalbilder.
- Kreditering-felt.

### Fase 5 – Utseende (Opus: ~1–2 t) ✓

- Stående bilder til venstre/høyre, tittel over hele bredden, format «som bildet».
- Banner-stiler, fonter (serif som i eksemplet), dekor-SVG-bibliotek.
- Maler: «4 cards venstre + 4 høyre», auto-layout av cards.

### Fase 6 – Utvidelser (senere)

- Nettkart-modus (MapLibre + Kartverket) med Terra Draw og snap-til-sti-ruting – se 6a–6d. ✓
- Bildejustering (lysstyrke/kontrast/metning).
- Stedsnavn-søk (Kartverket stedsnavn-API) for å plassere punkter.

#### Nettkart-modus – design

Bygger på OSM-kartvelgeren (`src/kart/`): nettkartet tegnes til et **georeferert kartbilde** (`kart.geo` = lng/lat-utstrekning i Web Mercator) i trykkoppløsning. Skiltet viser fortsatt et bilde, så eksport, lenkelinjer og punkter virker som før (WYSIWYG, ingen fliser ved eksport). Punkter, ruter og stedsnavn lagres fortsatt som bildekoordinater; `lngLatTilBildepunkt` / `bildepunktTilLngLat` oversetter når nettkart trengs. Datamodellen i § 3 (`kilde: 'nett'`) erstattes av dette.

**6a – Kartverket-grunnkart (Opus: ~45 min)**

- Nye kilder i kartvelgeren ved siden av OpenFreeMap: Kartverket `topo`, `topograatone`, `toporaster` (WMTS-raster, `cache.kartverket.no/v1/wmts/1.0.0/{lag}/default/webmercator/{z}/{y}/{x}.png`, ingen nøkkel, CC BY 4.0).
- `Osmstil` → `Kartkilde` (`{ type: 'vektor' | 'raster' }`); gamle `osm.stil` i `skilt.json` leses som før.
- Raster i trykkoppløsning: `tileSize = 256 / pixelRatio` så MapLibre henter fliser på høyere zoom i stedet for å skalere opp. Tak på zoom 18 (topo) → varsel om effektiv DPI hvis utsnittet er for detaljert.
- Kildetekst «© Kartverket» settes automatisk.

**6b – Rutetegning på nettkart med Terra Draw (Opus: ~1,5–2 t)**

- «Tegn på nettkart» i rutepanelet (kun når `kart.geo` finnes): dialog med MapLibre på samme kilde og utsnitt som kartbildet, rammet inn som kartrammen.
- `terra-draw` + `terra-draw-maplibre-gl-adapter`: `linestring`-modus for ny rute, `select`-modus for å dra/sette inn/slette noder. Eksisterende ruter, punkter og stedsnavn vises som referanselag.
- «Bruk» konverterer lng/lat → bildepunkter og skriver til ruta (ett angre-steg).

**6c – Snap til sti (Opus: ~1,5–2 t)**

- Ruting via BRouter (`brouter.de/brouter?lonlats=…&profile=…&format=geojson`), ingen nøkkel. Profiler: «Til fots» (`hiking-mountain`), «Sykkel» (`trekking`), «Bil» (`car-fast`).
- Nodene brukeren setter blir **via-punkter**; hvert segment rutes for seg, resultatet slås sammen og forenkles (`forenkle`, Douglas-Peucker) til et rimelig antall noder.
- Modell: `Rute.via?: Bildepunkt[]` og `Rute.folgerSti?: Ruteprofil`. Drar man et via-punkt, rutes bare nabosegmentene på nytt. «Slipp sti» gjør ruta til vanlige noder igjen.
- Også knapp «Følg sti» på eksisterende rute (bruker dagens noder som via-punkter), uten å åpne dialogen.
- Feil/tidsavbrudd per segment → segmentet blir rett linje + varsel. Enkel cache (segment-nøkkel → geometri) så angre/gjør om ikke spør på nytt.

**6d – Tester (Opus: ~45 min)**

- Unit: kilde-URL-er, raster-tileSize ved pixelRatio, via-punkt ↔ segment-sammenslåing, forenkling, BRouter-GeoJSON-parsing, bildepunkt ↔ lng/lat rundtur.
- E2E: Kartverket-fliser og BRouter mockes med `page.route`; tegn rute med tre klikk → følg sti → ruta får geometri fra mock og står på samme sted etter bytte av kartutsnitt.

**Gjennomført:** `src/kart/osm.ts` (Kartverket-stiler, `kartstil`), `src/kart/ruting.ts` (BRouter, via-punkter, cache), `src/kart/RuteNettkart.tsx` (Terra Draw-dialog), «Følg sti»-seksjon i rutepanelet. `src/kart/maplibre.ts` setter MapLibres worker-URL via Vite (`?worker&url`); uten den feiler workeren når Vite pakker avhengigheter. Avvik: `Kartkilde`-omdøping droppet, `Osmstil` er utvidet med `kv-*` i stedet (bakoverkompatibelt).

Estimat nettkart-modus: **ca. 4,5–6 t** agent-tid. Risiko: BRouters offentlige server har ingen oppetidsgaranti (kan byttes mot GraphHopper med nøkkel); Terra Draw-hendelser i React-dialog må ryddes ved lukking.

Estimat MVP (fase 0–4), Claude Opus agent-tid: **ca. 6–9 timer**, fordelt på 4–6 økter (én per fase + fiksrunder). I tillegg kommer din tid til testing og tilbakemelding, ca. 2–4 timer. Til sammenligning: ca. 2–2,5 uker for én utvikler for hånd.

Usikkerhet: eksport i høy oppløsning (fase 4) og følelsen i beskjæring/dra (fase 2) krever typisk flest runder med tilbakemelding. Visuell finpuss (fase 5) avhenger av hvor nær utkastet skiltet skal ligge.

---

## 6. Testing

| Lag                        | Hva                                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest)              | `tekst.txt`-parser, mappe → cards, bildeutsnitt → CSS-transform, zoom-grense (fyller alltid ramma), effektiv DPI, ankerberegning, mm↔px, kalibrert målestokk, strek-stil → dasharray, JSON-serialisering |
| Komponent (Vitest Browser) | Card-editor, bildevelger, beskjæring (zoom/pan), dra skillelinje, rute-editor, tegnforklaring                                                                                                            |
| E2E (Playwright)           | Åpne mappe → juster bilde → plasser punkt → koble card → tegn rute → eksport PNG; visuell snapshot-sammenligning                                                                                         |

---

## 7. Risikoer og avklaringer

| Risiko                                                                    | Tiltak                                                                                                                                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Kart.png` er bare 1004×1567 px                                           | Kartramme ca. 40 cm bred på A1 ved 250 DPI krever ca. 4000 px. Trenger høyoppløst eller vektor-versjon (SVG/PDF) av kartet, ellers blir det uskarpt. Appen varsler om lav DPI            |
| Høyoppløst eksport (A0 @ 300 DPI ≈ 14000×9900 px) sprenger canvas-grenser | Render i fliser og sy sammen, eller begrens til 150 DPI for A0. PDF: legg bilder inn som egne objekter i originaloppløsning, tekst som vektor                                            |
| Store originalbilder (344 MB totalt)                                      | Forhåndsvisninger i worker; eksport laster originaler én om gangen                                                                                                                       |
| Bilderettigheter                                                          | Kreditering per bilde, vises i liten tekst. Gjelder bl.a. `LHR-*ferdig.jpg`, `Oslo_Lja_bru_190331.jpg`, `milesteinen.avif`, `kongeveien.png` – ser ut til å være hentet fra andre kilder |
| File System Access API kun i Chrome/Edge                                  | OK siden kun PC; ellers fallback til zip-import/-eksport                                                                                                                                 |
| Fonter i PDF                                                              | Selvhostede webfonter (f.eks. Source Serif) embeddes i PDF                                                                                                                               |

**Funn i prosjektmappa (2026-09-25)**

- `tekst.txt`: 8 tekster + forfatterlinje. `utkast.png` viser bare 7 cards – **3 Ljanselva** mangler der.
- Ingen bildemappe for **6 Pilgrimsleden** (bare to `.url`-lenker til pilegrimsleden.no).
- `Kart.png` er et annet (forenklet, illustrert) kart enn det i `utkast.png`, og utsnittet er annerledes – Slora/Ljabru ligger helt i overkanten. Punktene må plasseres på nytt.
- Tekstene i `utkast.png` avviker noe fra `tekst.txt` (f.eks. Pilgrimsleden). `tekst.txt` er fasit.

**Avklart (2026-09-25)**

1. Kun PC (desktop-nettleser, mus + tastatur). Ingen touch/responsiv editor.
2. Én bruker, lokalt. Ingen innlogging, deling eller backend.
3. Eksport: PDF og PNG. Formatvalg A0–A3 + egendefinert; DPI-valg 150/300.
4. Ikke Punkt. Editor-UI: shadcn/ui + Tailwind.
5. Ingen interaktiv nettversjon. Kun trykkfil.
6. Bilder skal kunne byttes, skaleres og beskjæres (§ 1.1).
