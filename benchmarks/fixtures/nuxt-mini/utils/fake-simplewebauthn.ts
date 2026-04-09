// ~95 KB filler to simulate simplewebauthn
const FILLER = "s" .repeat(95 * 1024)
export const fakeSimplewebauthnBlob = FILLER
export function fakeSimplewebauthnInit(): boolean { return FILLER.length > 0 }
export const VERSION = "simplewebauthn@1.0.0"
