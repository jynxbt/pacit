// ~500 KB of deterministic filler to simulate @solana/web3.js
const FILLER = 'x'.repeat(500 * 1024)
export const fakeSolanaBlob = FILLER
export function fakeSolanaSign(msg: string): string {
  let h = 0
  for (let i = 0; i < msg.length; i++) h = (h * 31 + msg.charCodeAt(i)) | 0
  return h.toString(16) + FILLER.slice(0, 32)
}
export function fakeSolanaConnect(): boolean { return FILLER.length > 0 }
export const SOLANA_VERSION = '1.95.0'
