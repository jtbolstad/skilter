# Endringslogg

Alle merkbare endringer i Skilter. Formatet følger [Keep a Changelog](https://keepachangelog.com/no/),
og versjonsnumrene følger [semantisk versjonering](https://semver.org/lang/no/).

## [Ikke utgitt]

## [0.2.0] – 2026-09-26

### Lagt til

- **⤢ Tilpass**: gjør bildet mindre der teksten er kuttet, cards lavere der det er luft under teksten,
  og fordeler cardene i hver kolonne så ingen overlapper. Ett angresteg.
- **Tastatur**: piltaster flytter valgt card, banner, kart, dekor, vei eller stedsnavn 1 mm (til neste
  rutelinje når rutenettet er på). Shift + pil gjør rammen større i pilens retning, Ctrl + Shift + pil
  mindre. `?` eller ⌨ i verktøylinja viser alle hurtigtastene.
- **Nytt card** i laglista, og **slett card** med Delete eller knappen «Slett card».
- **Dekor bak eller foran**: «Legg bak» / «Legg foran» per dekor. Ny dekor legges foran.
- **Justeringer for alle cards**: tekststørrelse, rammetykkelse, hjørneradius, linjetykkelse og
  linjestil – ramme, hjørner og linjer opp til 800 %.
- **Rutenett** (5 mm): «# Rutenett» i verktøylinja fester rammer når de dras (Alt = fritt), og
  «Plasser cards på rutenettet» retter opp alle cards.
- **Tekstformater**: nummerert, Markdown og skillelinjer, gjenkjent automatisk. Tekstfila kan være
  `.txt` eller `.md`, og fil og format kan velges ved ny innlesing.
- **Demoprosjekt** («Demodalen») med tekst, bilder og kart – «🧪 Prøv demoprosjektet» på startsiden.
- **Nettversjon** på [jtbolstad.github.io/skilter](https://jtbolstad.github.io/skilter/).
- Dekor samles i en egen gruppe i laglista.

### Endret

- Skriften i cards skalerer med skiltformatet, ikke med cardet: den endres ikke når cardet får ny
  størrelse, og ramme og polstring er like i alle cards.
- Oppsett: kartet står alltid i midten, med cards til venstre og høyre eller over og under.
  «Kart til venstre» og «Kart øverst» er fjernet.
- Skiltpanelet: «Tilpass» og «Alle cards» øverst, «Format» nederst.
- Linjene fra cards til kartet går under cards og over kartet.
- ESLint og Prettier er byttet ut med Biome, og TypeScript er oppgradert til 7.

### Rettet

- Rask dra i et hjørnehåndtak eller et lite element (f.eks. kompassrosa) gikk tapt.

## [0.1.0] – 2026-09-26

Første utgivelse, med Windows-installer.

### Lagt til

- Leser prosjektmappa direkte: cards fra `tekst.txt`, bilder fra bildemappene og `Kart.png`.
- Cards med tittel, tekst (_kursiv_ og **fet**) og bilde over, til venstre eller til høyre.
- Bilder: bytt, beskjær, zoom, roter og speilvend – originalfilene endres aldri.
- Kart: punkter koblet til cards med linjer, veier og stier med stiler og tegnforklaring, stedsnavn,
  kalibrert målestokk og nordpil.
- Nettkart fra OpenStreetMap og Kartverket, med vei-tegning som kan følge stien (BRouter).
- Banner-stiler, tema, oppsettmaler og dekor (skog, steinbro, gress, kompass).
- Autolagring til `skilt.json`, med angre og gjør om.
- Eksport til PDF (vektortekst, innebygde fonter) og PNG i 150 eller 300 DPI.
- Skrivebordsapp for Windows (Tauri).

[Ikke utgitt]: https://github.com/jtbolstad/skilter/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/jtbolstad/skilter/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/jtbolstad/skilter/releases/tag/v0.1.0
