// Génère les icônes PNG de la PWA (public/icons/) : fond vermillon + disque
// blanc, en 192, 512, 512 maskable (safe zone) et 180 (apple-touch-icon).
// Aucun rendu SVG nécessaire : formes géométriques tracées pixel par pixel.
// Usage : npm run icons
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

const BG = [0xc8, 0x44, 0x2e] // --vermillon
const FG = [0xf4, 0xf1, 0xea] // --surface washi

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = Array.from({ length: 256 }, (_, n) => {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      return c >>> 0
    })
  }
  let c = 0xffffffff
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, radiusRatio) {
  const rgba = Buffer.alloc(size * size * 4)
  const c = (size - 1) / 2
  const r = size * radiusRatio
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c
      const dy = y - c
      const inside = dx * dx + dy * dy <= r * r
      const [pr, pg, pb] = inside ? FG : BG
      const i = (y * size + x) * 4
      rgba[i] = pr
      rgba[i + 1] = pg
      rgba[i + 2] = pb
      rgba[i + 3] = 0xff
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0 // filter: none
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

const targets = [
  ['icon-192.png', 192, 0.5],
  ['icon-512.png', 512, 0.5],
  ['icon-512-maskable.png', 512, 0.4], // safe zone maskable = 80 % du diamètre
  ['apple-touch-icon.png', 180, 0.5],
]
for (const [name, size, ratio] of targets) {
  fs.writeFileSync(path.join(outDir, name), encodePng(size, ratio))
  console.log('généré:', `public/icons/${name}`)
}
