import { useEffect, useState } from 'react';
import { hentForhandsvisning, hentOriginalUrl, type Forhandsvisning } from '../fil/forhandsvisning';
import { useSkilt } from '../store';

export function useForhandsvisning(sti: string | undefined): Forhandsvisning | undefined {
  const mappe = useSkilt((t) => t.mappe);
  const [resultat, settResultat] = useState<{ sti: string; f: Forhandsvisning }>();

  useEffect(() => {
    if (!sti || !mappe) return;
    let aktiv = true;
    hentForhandsvisning(sti, mappe.lesFil)
      .then((f) => aktiv && settResultat({ sti, f }))
      .catch((err: unknown) => console.warn(`Kunne ikke lage forhåndsvisning av ${sti}`, err));
    return () => {
      aktiv = false;
    };
  }, [sti, mappe]);

  return resultat && resultat.sti === sti ? resultat.f : undefined;
}

export function useOriginalUrl(sti: string | undefined): string | undefined {
  const mappe = useSkilt((t) => t.mappe);
  const [resultat, settResultat] = useState<{ sti: string; url: string }>();

  useEffect(() => {
    if (!sti || !mappe) return;
    let aktiv = true;
    hentOriginalUrl(sti, mappe.lesFil)
      .then((url) => aktiv && settResultat({ sti, url }))
      .catch((err: unknown) => console.warn(`Kunne ikke lese ${sti}`, err));
    return () => {
      aktiv = false;
    };
  }, [sti, mappe]);

  return resultat && resultat.sti === sti ? resultat.url : undefined;
}
