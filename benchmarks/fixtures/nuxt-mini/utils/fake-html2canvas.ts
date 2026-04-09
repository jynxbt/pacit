// ~70 KB filler to simulate html2canvas
const FILLER = "h" .repeat(70 * 1024)
export const fakeHtml2canvasBlob = FILLER
export function fakeHtml2canvasInit(): boolean { return FILLER.length > 0 }
export const VERSION = "html2canvas@1.0.0"
