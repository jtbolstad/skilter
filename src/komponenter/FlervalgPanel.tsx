import { type Kant, likAvstand, rettInn, sammeStorrelse } from '../geometri/justering';
import type { Rektangel, Skilt } from '../modell/typer';
import { type Rammeref, rammeTil, useSkilt } from '../store';
import { Gruppe, knapp, Seksjon } from './Skjema';

const INNRETTING: { kant: Kant; navn: string; tittel: string }[][] = [
  [
    { kant: 'venstre', navn: '⇤ Venstre', tittel: 'Venstrekantene på linje' },
    { kant: 'midt-vannrett', navn: '↔ Midten', tittel: 'Midtpunktene på en loddrett linje' },
    { kant: 'hoyre', navn: 'Høyre ⇥', tittel: 'Høyrekantene på linje' },
  ],
  [
    { kant: 'topp', navn: '⤒ Topp', tittel: 'Overkantene på linje' },
    { kant: 'midt-loddrett', navn: '↕ Midten', tittel: 'Midtpunktene på en vannrett linje' },
    { kant: 'bunn', navn: '⤓ Bunn', tittel: 'Underkantene på linje' },
  ],
];

/** Justering av to eller flere valgte rammer: størrelse, innretting og lik avstand. */
export function Flervalg({ skilt, valgte }: { skilt: Skilt; valgte: Rammeref[] }) {
  const elementer = valgte.flatMap((ref) => {
    const ramme = rammeTil(skilt, ref);
    return ramme ? [{ ref, ramme }] : [];
  });
  const bruk = (justering: (rammer: Rektangel[]) => Rektangel[]) => {
    const nye = justering(elementer.map((e) => e.ramme));
    useSkilt.getState().settRammer(elementer.map((e, i) => ({ ref: e.ref, ramme: nye[i]! })));
  };
  const knappgrid = 'grid grid-cols-2 gap-1';

  return (
    <Seksjon tittel={`${elementer.length} valgt`}>
      <p className="text-stone-500">
        Ctrl eller Shift + klikk legger til eller tar ut. Dra eller bruk piltastene for å flytte alle. Delete
        sletter valgte cards og dekor.
      </p>
      <Gruppe etikett="Samme størrelse">
        <div className={knappgrid}>
          <button className={knapp} onClick={() => bruk((r) => sammeStorrelse(r, 'vannrett', 'storste'))}>
            Bredde som bredeste
          </button>
          <button className={knapp} onClick={() => bruk((r) => sammeStorrelse(r, 'vannrett', 'minste'))}>
            Bredde som smaleste
          </button>
          <button className={knapp} onClick={() => bruk((r) => sammeStorrelse(r, 'loddrett', 'storste'))}>
            Høyde som høyeste
          </button>
          <button className={knapp} onClick={() => bruk((r) => sammeStorrelse(r, 'loddrett', 'minste'))}>
            Høyde som laveste
          </button>
        </div>
      </Gruppe>
      <Gruppe etikett="Rett inn">
        {INNRETTING.map((rad, i) => (
          <div key={i} className="grid grid-cols-3 gap-1">
            {rad.map((k) => (
              <button
                key={k.kant}
                title={k.tittel}
                className={knapp}
                onClick={() => bruk((r) => rettInn(r, k.kant))}
              >
                {k.navn}
              </button>
            ))}
          </div>
        ))}
      </Gruppe>
      <Gruppe etikett="Lik avstand">
        <div className={knappgrid}>
          <button
            className={knapp}
            disabled={elementer.length < 3}
            title="Like mellomrom over hverandre. Den øverste og nederste står i ro."
            onClick={() => bruk((r) => likAvstand(r, 'loddrett'))}
          >
            ↕ Loddrett
          </button>
          <button
            className={knapp}
            disabled={elementer.length < 3}
            title="Like mellomrom ved siden av hverandre. Den første og siste står i ro."
            onClick={() => bruk((r) => likAvstand(r, 'vannrett'))}
          >
            ↔ Vannrett
          </button>
        </div>
        {elementer.length < 3 && <p className="text-xs text-stone-500">Velg minst tre.</p>}
      </Gruppe>
    </Seksjon>
  );
}
