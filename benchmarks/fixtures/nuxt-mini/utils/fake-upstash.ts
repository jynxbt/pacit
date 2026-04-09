// ~65 KB filler to simulate upstash
const FILLER = "u" .repeat(65 * 1024)
export const fakeUpstashBlob = FILLER
export function fakeUpstashInit(): boolean { return FILLER.length > 0 }
export const VERSION = "upstash@1.0.0"
