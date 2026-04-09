// ~80 KB filler to simulate canvas
const FILLER = "c" .repeat(80 * 1024)
export const fakeCanvasBlob = FILLER
export function fakeCanvasInit(): boolean { return FILLER.length > 0 }
export const VERSION = "canvas@1.0.0"
