// ~75 KB filler to simulate drizzle
const FILLER = "d" .repeat(75 * 1024)
export const fakeDrizzleBlob = FILLER
export function fakeDrizzleInit(): boolean { return FILLER.length > 0 }
export const VERSION = "drizzle@1.0.0"
