// ~100 KB filler to simulate noble-curves
const FILLER = "n" .repeat(100 * 1024)
export const fakeNoblecurvesBlob = FILLER
export function fakeNoblecurvesInit(): boolean { return FILLER.length > 0 }
export const VERSION = "noble-curves@1.0.0"
