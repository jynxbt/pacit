// ~110 KB filler to simulate tanstack
const FILLER = "t" .repeat(110 * 1024)
export const fakeTanstackBlob = FILLER
export function fakeTanstackInit(): boolean { return FILLER.length > 0 }
export const VERSION = "tanstack@1.0.0"
