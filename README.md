# Skilter

App for å lage trykkferdige informasjonsskilt: banner, kart med steder og veier, og kort med bilde og
tekst koblet til stedene med linjer. Kjører i nettleseren eller som Windows-app. Laget for skiltet «Et historisk kulturlandskap –
Hauketo · Prinsdal».

![Ferdig skilt](docs/bilder/19-ferdig-skilt.jpg)

## Bruk eller last ned

**[🌐 Åpne Skilter i nettleseren](https://jtbolstad.github.io/skilter/)** – virker i Chrome og Edge på
Windows og Mac, uten installasjon.

**[⬇ Last ned Skilter for Windows](https://github.com/jtbolstad/skilter/releases/latest/download/Skilter-x64-setup.exe)**
(ca. 6 MB) · [Alle versjoner](https://github.com/jtbolstad/skilter/releases)

På Mac: bruk nettversjonen i Chrome eller Edge. Safari kan ikke åpne mapper.

Installeren er ikke signert, så Windows SmartScreen kan vise «Ukjent utgiver». Trykk **Mer info** og
**Kjør likevel**. Trykk **🧪 Prøv demoprosjektet** på startsiden for å prøve appen uten egen mappe.

## Funksjoner

- **Leser prosjektmappa direkte:** kort lages fra tekstfila og bildemappene (`1 Slora/`, …).
- **Tekstformater:** nummerert (`1. Navn`), Markdown (`## Navn`) eller `---` mellom kortene –
  gjenkjennes automatisk, og fila kan være `.txt` eller `.md`.
- **Kort:** tekst med _kursiv_ og **fet**, bilde over, til venstre eller til høyre, også stående bilder.
  Legg til nye kort, slett med Delete.
- **Alle kort på en gang:** tekststørrelse, rammetykkelse, hjørneradius, linjetykkelse og linjestil.
  Skriften er like stor i alle kort, uansett kortets størrelse.
- **Tilpass automatisk:** gjør bildene akkurat så mye mindre at teksten får plass, og plasser kortene
  på et 5 mm-rutenett. Rutenettet kan også slås på mens du drar (Alt = fritt).
- **Bilder:** bytt, beskjær, zoom, roter og speilvend direkte på skiltet – originalfilene endres aldri.
- **Kart:** eget kartbilde eller nettkart fra OpenStreetMap og Kartverket. Punkter koblet til kort,
  veier og stier (også fulgt langs stien med BRouter), tegnforklaring, stedsnavn, målestokk og nordpil.
- **Utseende:** banner-stiler, tema, oppsettmaler og dekor (skog, steinbro, gress, kompass), samlet i
  en egen gruppe i laglista.
- **Lagres automatisk** til `skilt.json` i mappa, med angre og gjør om.
- **Eksport:** PDF med vektortekst og innebygde fonter, eller PNG i 150/300 DPI.
- **Demoprosjekt** med tekst, bilder og kart – prøv appen uten egen mappe.

## Kom i gang

Krever [Node.js](https://nodejs.org/) 22+, [pnpm](https://pnpm.io/) og Chrome eller Edge på PC.

```sh
pnpm install
pnpm dev
```

Åpne http://localhost:5330 og velg prosjektmappa. I utvikling åpner `http://localhost:5330/?demo`
mappa over `app/` uten mappevelger.

| Kommando         | Hva                                               |
| ---------------- | ------------------------------------------------- |
| `pnpm dev`       | Utviklingsserver på port 5330                     |
| `pnpm test`      | Enhetstester (Vitest)                             |
| `pnpm test:e2e`  | E2E-tester (Playwright, installert Chrome)        |
| `pnpm lint`      | Biome: lint og formatering (`pnpm format` retter) |
| `pnpm build`     | Typesjekk (TypeScript 7) og bygg til `dist/`      |
| `pnpm app:dev`   | Skrivebordsapp (Tauri) mot dev-serveren           |
| `pnpm app:build` | Windows-installer (Tauri/NSIS)                    |

Skrivebordsappen krever i tillegg [Rust](https://rustup.rs/) og MSVC Build Tools. Installeren
havner i `src-tauri/target/release/bundle/nsis/`.

### Utgivelse

- **Nettversjonen** publiseres til GitHub Pages ved hver push til `master`.
- **Windows-installeren** bygges ved en `v*`-tagg og legges på en GitHub-release. Øk versjonen i
  `package.json` og `src-tauri/tauri.conf.json` først, så:

```sh
git tag -a v0.2.0 -m "Skilter 0.2.0"
git push origin v0.2.0
```

## Prosjektmappa

```
skilter/
├── tekst.txt        Tekstene (eller tekst.md): nummerert, Markdown eller «---» mellom kortene
├── Kart.png         Kartbildet
├── 1 Slora/ …       Bilder til hvert kort
├── skilt.json       Skiltet (lagres av appen)
├── eksport/         PNG-eksport
└── app/             Denne appen
```

Vil du bare prøve appen, trykk **🧪 Prøv demoprosjektet** på startsiden (eller åpne
`?demo=innebygd`). Demoen ligger i `public/demo/` og følger med i den installerte appen.

## Dokumentasjon

- [Bruksanvisning](docs/BRUKSANVISNING.md) – steg for steg, med illustrasjoner
- [Teknisk beskrivelse](docs/TEKNISK.md) – arkitektur, datamodell, eksport og testing
- [Plan](PLAN.md) – faser, avklaringer og status
- [TODO](TODO.md) – ønskeliste og hva som er gjort

## Teknologi

React 19, TypeScript 7, Vite, Tailwind CSS, Zustand, MapLibre GL, Terra Draw, File System Access API,
IndexedDB, modern-screenshot, Tauri 2, Biome, Vitest og Playwright. Ingen egen server – alt kjører
lokalt i nettleseren; bare nettkart, stedsøk og ruting henter data fra nettet.
