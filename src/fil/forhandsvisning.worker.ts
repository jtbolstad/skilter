/// <reference lib="webworker" />
export interface Foresporsel {
  id: number;
  fil: Blob;
  maksSide: number;
}

export type Svar =
  | { id: number; ok: true; blob: Blob; bredde: number; hoyde: number }
  | { id: number; ok: false; feil: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async (e: MessageEvent<Foresporsel>) => {
  const { id, fil, maksSide } = e.data;
  try {
    const original = await createImageBitmap(fil);
    const { width: bredde, height: hoyde } = original;
    const faktor = Math.min(1, maksSide / Math.max(bredde, hoyde));
    const b = Math.max(1, Math.round(bredde * faktor));
    const h = Math.max(1, Math.round(hoyde * faktor));
    const liten = await createImageBitmap(original, {
      resizeWidth: b,
      resizeHeight: h,
      resizeQuality: 'high',
    });
    original.close();
    const lerret = new OffscreenCanvas(b, h);
    lerret.getContext('2d')!.drawImage(liten, 0, 0);
    liten.close();
    const blob = await lerret.convertToBlob({ type: 'image/webp', quality: 0.85 });
    scope.postMessage({ id, ok: true, blob, bredde, hoyde } satisfies Svar);
  } catch (err) {
    scope.postMessage({ id, ok: false, feil: String(err) } satisfies Svar);
  }
};
