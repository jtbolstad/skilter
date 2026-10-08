declare const __APP_VERSJON__: string | undefined;

/** Versjonen av appen, fra package.json (satt av Vite ved bygging) */
export const APP_VERSJON: string = typeof __APP_VERSJON__ === 'string' ? __APP_VERSJON__ : 'ukjent';
