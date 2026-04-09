// ~85 KB filler to simulate irys
const FILLER = "i" .repeat(85 * 1024)
export const fakeIrysBlob = FILLER
export function fakeIrysInit(): boolean { return FILLER.length > 0 }
export const VERSION = "irys@1.0.0"
