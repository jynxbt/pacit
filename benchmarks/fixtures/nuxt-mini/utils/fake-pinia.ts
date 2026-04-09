// ~90 KB filler to simulate pinia
const FILLER = "p" .repeat(90 * 1024)
export const fakePiniaBlob = FILLER
export function fakePiniaInit(): boolean { return FILLER.length > 0 }
export const VERSION = "pinia@1.0.0"
