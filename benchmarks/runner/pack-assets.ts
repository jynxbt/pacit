#!/usr/bin/env bun
/**
 * Packs a web directory into a pacit-assets.pak archive.
 *
 * Usage: bun run pack-assets.ts <webDir> <outputPath>
 *
 * Archive format:
 *   HEADER (64 bytes): magic "PACT", version u32, indexOffset u64, indexCount u32, buildId 32 bytes, reserved 20 bytes
 *   PAYLOAD: concatenated asset bytes (identity — no compression for v1)
 *   INDEX: for each asset: pathLen u16, path utf8, offset u64, length u64, origLength u64, mimeLen u16, mimeType utf8, flags u16, etag 16 bytes
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs'
import { join, relative, extname } from 'path'
import { createHash } from 'crypto'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.xml': 'text/xml',
  '.txt': 'text/plain',
  '.map': 'application/json',
}

interface AssetFile {
  path: string       // relative path (e.g. "_nuxt/entry.abc.js")
  data: Buffer
  mimeType: string
  etag: Buffer       // 16-byte sha256 truncated
}

function walkDir(dir: string, base: string = dir): AssetFile[] {
  const files: AssetFile[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath, base))
    } else if (entry.isFile()) {
      const relPath = relative(base, fullPath)
      const data = readFileSync(fullPath)
      const ext = extname(entry.name).toLowerCase()
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
      const hash = createHash('sha256').update(data).digest()
      const etag = hash.subarray(0, 16) // truncated to 128 bits
      files.push({ path: relPath, data, mimeType, etag })
    }
  }
  return files
}

function packAssets(webDir: string, outputPath: string): void {
  const files = walkDir(webDir)
  console.log(`📦 Packing ${files.length} assets from ${webDir}`)

  // Build full tree hash for buildId
  const treeHash = createHash('sha256')
  for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
    treeHash.update(f.path)
    treeHash.update(f.etag)
  }
  const buildId = treeHash.digest()

  // Phase 1: write header placeholder + payload
  const headerSize = 64
  const payloads: { file: AssetFile; offset: number; length: number }[] = []
  let payloadOffset = headerSize

  // Calculate total payload size
  let totalPayload = 0
  for (const f of files) {
    totalPayload += f.data.length
  }

  // Allocate buffer for payload
  const payloadBuf = Buffer.alloc(headerSize + totalPayload)
  let currentOffset = headerSize

  for (const f of files) {
    f.data.copy(payloadBuf, currentOffset)
    payloads.push({ file: f, offset: currentOffset, length: f.data.length })
    currentOffset += f.data.length
  }

  // Phase 2: build index
  const indexParts: Buffer[] = []
  for (const { file, offset, length } of payloads) {
    const pathBuf = Buffer.from(file.path, 'utf8')
    const mimeBuf = Buffer.from(file.mimeType, 'utf8')

    // pathLen(2) + path + offset(8) + length(8) + origLength(8) + mimeLen(2) + mime + flags(2) + etag(16)
    const entrySize = 2 + pathBuf.length + 8 + 8 + 8 + 2 + mimeBuf.length + 2 + 16
    const entry = Buffer.alloc(entrySize)
    let pos = 0

    entry.writeUInt16LE(pathBuf.length, pos); pos += 2
    pathBuf.copy(entry, pos); pos += pathBuf.length
    entry.writeBigUInt64LE(BigInt(offset), pos); pos += 8
    entry.writeBigUInt64LE(BigInt(length), pos); pos += 8
    entry.writeBigUInt64LE(BigInt(length), pos); pos += 8  // origLength = length (identity)
    entry.writeUInt16LE(mimeBuf.length, pos); pos += 2
    mimeBuf.copy(entry, pos); pos += mimeBuf.length
    entry.writeUInt16LE(0x04, pos); pos += 2  // flags: identity
    file.etag.copy(entry, pos); pos += 16

    indexParts.push(entry)
  }

  const indexBuf = Buffer.concat(indexParts)
  const indexOffset = payloadBuf.length

  // Phase 3: write header
  // magic "PACT" (4) + version u32 (4) + indexOffset u64 (8) + indexCount u32 (4) + buildId (32) + reserved (12)
  payloadBuf.write('PACT', 0, 4, 'ascii')
  payloadBuf.writeUInt32LE(1, 4)                           // version
  payloadBuf.writeBigUInt64LE(BigInt(indexOffset), 8)      // index_offset
  payloadBuf.writeUInt32LE(files.length, 16)               // index_count
  buildId.copy(payloadBuf, 20, 0, 32)                      // build_id
  // reserved bytes 52-63 are already zero

  // Phase 4: concatenate and write
  const output = Buffer.concat([payloadBuf, indexBuf])
  writeFileSync(outputPath, output)

  const sizeKB = (output.length / 1024).toFixed(1)
  console.log(`  ✅ Packed ${files.length} files → ${outputPath} (${sizeKB} KB)`)

  // Also write manifest for debugging
  const manifest = payloads.map(p => ({
    path: p.file.path,
    offset: p.offset,
    length: p.length,
    mimeType: p.file.mimeType,
    etag: p.file.etag.toString('hex'),
  }))
  writeFileSync(outputPath.replace('.pak', '.manifest.json'), JSON.stringify(manifest, null, 2))
}

// CLI entry
const [webDir, outputPath] = process.argv.slice(2)
if (!webDir || !outputPath) {
  console.error('Usage: bun run pack-assets.ts <webDir> <outputPath>')
  process.exit(1)
}

packAssets(webDir, outputPath)
