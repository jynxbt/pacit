// ~300 KB filler to simulate @coral-xyz/anchor
const FILLER = 'a'.repeat(300 * 1024)
export const fakeAnchorBlob = FILLER
export function fakeAnchorParse(data: string): number {
  let h = 0
  for (let i = 0; i < data.length; i++) h = (h * 17 + data.charCodeAt(i)) | 0
  return h
}
export function fakeAnchorInit(): boolean { return FILLER.length > 0 }
export const ANCHOR_VERSION = '0.32.1'
