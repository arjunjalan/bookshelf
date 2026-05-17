// Run from frontend/: node scripts/generate-icons.mjs
// Rasterises public/icon.svg → PNG icons at required PWA sizes.
// Uses @resvg/resvg-js; falls back to solid-color PNGs (no deps) if unavailable.
import { deflateSync } from 'zlib'
import { writeFileSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pub = resolve(__dirname, '../public')

// --- Pure-Node PNG writer (fallback) ---
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return (c ^ 0xffffffff) >>> 0
}
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const cv = Buffer.alloc(4)
  cv.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, cv])
}
function solidPNG(size, r, g, b) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2
  const stride = 1 + size * 3
  const raw = Buffer.alloc(size * stride)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x++) {
      raw[y * stride + 1 + x * 3] = r
      raw[y * stride + 1 + x * 3 + 1] = g
      raw[y * stride + 1 + x * 3 + 2] = b
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

async function generateIcon(size, filename) {
  const outPath = resolve(pub, filename)
  try {
    const { Resvg } = await import('@resvg/resvg-js')
    const svg = readFileSync(resolve(pub, 'icon.svg'), 'utf8')
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
    writeFileSync(outPath, resvg.render().asPng())
    console.log(`✓ ${filename} (${size}×${size}) rendered from SVG`)
  } catch {
    writeFileSync(outPath, solidPNG(size, 79, 70, 229)) // indigo-600
    console.log(`✓ ${filename} (${size}×${size}) solid-color fallback`)
  }
}

await generateIcon(192, 'icon-192.png')
await generateIcon(512, 'icon-512.png')
await generateIcon(180, 'apple-touch-icon.png')
console.log('Done — icons in frontend/public/')
