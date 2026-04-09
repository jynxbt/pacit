// ~200 KB filler to simulate @tiptap/core + starter-kit
const FILLER = 't'.repeat(200 * 1024)
export const fakeTiptapBlob = FILLER
export function fakeTiptapRender(content: string): string {
  return '<p>' + content + '</p>' + FILLER.slice(0, 16)
}
export function fakeTiptapInit(): boolean { return FILLER.length > 0 }
export const TIPTAP_VERSION = '2.5.0'
