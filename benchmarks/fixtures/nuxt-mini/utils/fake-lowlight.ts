// ~60 KB filler to simulate lowlight
const FILLER = "l" .repeat(60 * 1024)
export const fakeLowlightBlob = FILLER
export function fakeLowlightInit(): boolean { return FILLER.length > 0 }
export const VERSION = "lowlight@1.0.0"
