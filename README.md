# Skilter

Nettleserapp for å lage trykkferdige informasjonsskilt: banner, kart med steder og veier, og kort med
bilde og tekst koblet til stedene med linjer. Laget for skiltet «Et historisk kulturlandskap –
Hauketo · Prinsdal».

![Ferdig skilt](docs/bilder/19-ferdig-skilt.jpg)

## Funksjoner

- **Leser prosjektmappa direkte:** kort lages fra `tekst.txt` og bildemappene (`1 Slora/`, …).
- **Kort:** tekst med _kursiv_ og **fet**, bilde over, til venstre eller til høyre, også stående bilder.
- **Bilder:** bytt, beskjær, zoom, roter og speilvend direkte på skiltet – originalfilene endres aldri.
- **Kart:** punkter koblet til kort, veier og stier med stiler og tegnforklaring, stedsnavn,
  kalibrert målestokk og nordpil.
- **Utseende:** banner-stiler, tema, oppsettmaler og dekor (skog, steinbro, gress, kompass).
- **Lagres automatisk** til `skilt.json` i mappa, med angre og gjør om.
- **Eksport:** PDF med vektortekst og innebygde fonter, eller PNG i 150/300 DPI.

## Kom i gang

Krever [Node.js](https://nodejs.org/) 22+, [pnpm](https://pnpm.io/) og Chrome eller Edge på PC.

```sh
pnpm install
pnpm dev
```

Åpne http://localhost:5330 og velg prosjektmappa. I utvikling åpner `http://localhost:5330/?demo`
mappa over `app/` uten mappevelger.

| Kommando         | Hva                                        |
| ---------------- | ------------------------------------------ |
| `pnpm dev`       | Utviklingsserver på port 5330              |
| `pnpm test`      | Enhetstester (Vitest)                      |
| `pnpm test:e2e`  | E2E-tester (Playwright, installert Chrome) |
| `pnpm lint`      | ESLint og Prettier                         |
| `pnpm build`     | Typesjekk og produksjonsbygg til `dist/`   |
| `pnpm app:dev`   | Skrivebordsapp (Tauri) mot dev-serveren    |
| `pnpm app:build` | Windows-installer (Tauri/NSIS)             |

Skrivebordsappen krever i tillegg [Rust](https://rustup.rs/) og MSVC Build Tools. Installeren
havner i `src-tauri/target/release/bundle/nsis/`.

## Prosjektmappa

```
skilter/
├── tekst.txt        Tekstene: nummerert, Markdown (tekst.md) eller med «---» mellom seksjonene
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

## Teknologi

React 19, TypeScript, Vite, Tailwind CSS, Zustand, File System Access API, IndexedDB,
modern-screenshot, Vitest og Playwright. Ingen server – alt kjører lokalt i nettleseren.
