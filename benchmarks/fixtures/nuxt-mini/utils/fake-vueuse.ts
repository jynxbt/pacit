// ~120 KB filler to simulate vueuse
const FILLER = "v" .repeat(120 * 1024)
export const fakeVueuseBlob = FILLER
export function fakeVueuseInit(): boolean { return FILLER.length > 0 }
export const VERSION = "vueuse@1.0.0"
