import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  FoldHorizontal,
  FoldVertical,
  type LucideIcon,
  UnfoldHorizontal,
  UnfoldVertical,
} from 'lucide-react';
import { type Kant, likAvstand, rettInn, sammeStorrelse } from '../geometri/justering';
import type { Rektangel, Skilt } from '../modell/typer';
import { type Rammeref, rammeTil, useSkilt } from '../store';
import { Gruppe, IkonKnapp, Seksjon } from './Skjema';

const INNRETTING: { kant: Kant; ikon: LucideIcon; navn: string; tittel: string }[][] = [
  [
    { kant: 'venstre', ikon: AlignStartVertical, navn: 'Venstre', tittel: 'Venstrekantene på linje' },
    {
      kant: 'midt-vannrett',
      ikon: AlignCenterVertical,
      navn: 'Midten vannrett',
      tittel: 'Midtpunktene på en loddrett linje',
    },
    { kant: 'hoyre', ikon: AlignEndVertical, navn: 'Høyre', tittel: 'Høyrekantene på linje' },
  ],
  [
    { kant: 'topp', ikon: AlignStartHorizontal, navn: 'Topp', tittel: 'Overkantene på linje' },
    {
      kant: 'midt-loddrett',
      ikon: AlignCenterHorizontal,
      navn: 'Midten loddrett',
      tittel: 'Midtpunktene på en vannrett linje',
    },
    { kant: 'bunn', ikon: AlignEndHorizontal, navn: 'Bunn', tittel: 'Underkantene på linje' },
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
        sletter valgte cards, dekor, tekster og bilder.
      </p>
      <Gruppe etikett="Samme størrelse">
        <div className={knappgrid}>
          <IkonKnapp
            ikon={UnfoldHorizontal}
            navn="Bredde som bredeste"
            onClick={() => bruk((r) => sammeStorrelse(r, 'vannrett', 'storste'))}
          />
          <IkonKnapp
            ikon={FoldHorizontal}
            navn="Bredde som smaleste"
            onClick={() => bruk((r) => sammeStorrelse(r, 'vannrett', 'minste'))}
          />
          <IkonKnapp
            ikon={UnfoldVertical}
            navn="Høyde som høyeste"
            onClick={() => bruk((r) => sammeStorrelse(r, 'loddrett', 'storste'))}
          />
          <IkonKnapp
            ikon={FoldVertical}
            navn="Høyde som laveste"
            onClick={() => bruk((r) => sammeStorrelse(r, 'loddrett', 'minste'))}
          />
        </div>
      </Gruppe>
      <Gruppe etikett="Rett inn">
        {INNRETTING.map((rad, i) => (
          <div key={i} className="grid grid-cols-3 gap-1">
            {rad.map((k) => (
              <IkonKnapp
                key={k.kant}
                ikon={k.ikon}
                navn={k.navn}
                title={k.tittel}
                onClick={() => bruk((r) => rettInn(r, k.kant))}
              />
            ))}
          </div>
        ))}
      </Gruppe>
      <Gruppe etikett="Lik avstand">
        <div className={knappgrid}>
          <IkonKnapp
            ikon={AlignVerticalDistributeCenter}
            navn="Lik avstand loddrett"
            disabled={elementer.length < 3}
            title="Like mellomrom over hverandre. Den øverste og nederste står i ro."
            onClick={() => bruk((r) => likAvstand(r, 'loddrett'))}
          />
          <IkonKnapp
            ikon={AlignHorizontalDistributeCenter}
            navn="Lik avstand vannrett"
            disabled={elementer.length < 3}
            title="Like mellomrom ved siden av hverandre. Den første og siste står i ro."
            onClick={() => bruk((r) => likAvstand(r, 'vannrett'))}
          />
        </div>
        {elementer.length < 3 && <p className="text-xs text-stone-500">Velg minst tre.</p>}
      </Gruppe>
    </Seksjon>
  );
}
