// One-off: trim transparent padding from the square Maple Key logo so it
// renders at full size in headers. Uses only Node built-ins (no deps).
import { readFileSync, writeFileSync } from "node:fs"
import { inflateSync, deflateSync } from "node:zlib"

const SRC = new URL("../public/Maple_Key_Transp_Background.png", import.meta.url)
const OUT = new URL("../public/maple-key-logo.png", import.meta.url)

// --- CRC32 (PNG chunk checksums) ---
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// --- read + parse PNG chunks ---
const file = readFileSync(SRC)
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
if (!file.subarray(0, 8).equals(sig)) throw new Error("not a PNG")

let pos = 8
let ihdr = null
const idat = []
while (pos < file.length) {
  const len = file.readUInt32BE(pos)
  const type = file.toString("ascii", pos + 4, pos + 8)
  const data = file.subarray(pos + 8, pos + 8 + len)
  if (type === "IHDR") ihdr = data
  else if (type === "IDAT") idat.push(data)
  pos += 12 + len
}

const width = ihdr.readUInt32BE(0)
const height = ihdr.readUInt32BE(4)
const bitDepth = ihdr.readUInt8(8)
const colorType = ihdr.readUInt8(9)
const interlace = ihdr.readUInt8(12)
if (bitDepth !== 8 || colorType !== 6 || interlace !== 0)
  throw new Error(`unsupported PNG: depth=${bitDepth} color=${colorType} interlace=${interlace}`)

const bpp = 4 // RGBA
const stride = width * bpp
const raw = inflateSync(Buffer.concat(idat))

// --- defilter into a flat RGBA buffer ---
const px = Buffer.alloc(height * stride)
const paeth = (a, b, c) => {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}
let rp = 0
for (let y = 0; y < height; y++) {
  const filter = raw[rp++]
  for (let x = 0; x < stride; x++) {
    const cur = raw[rp++]
    const a = x >= bpp ? px[y * stride + x - bpp] : 0
    const b = y > 0 ? px[(y - 1) * stride + x] : 0
    const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0
    let val
    switch (filter) {
      case 0: val = cur; break
      case 1: val = cur + a; break
      case 2: val = cur + b; break
      case 3: val = cur + ((a + b) >> 1); break
      case 4: val = cur + paeth(a, b, c); break
      default: throw new Error("bad filter " + filter)
    }
    px[y * stride + x] = val & 0xff
  }
}

// --- alpha bounding box ---
const ALPHA = 10
let minX = width, minY = height, maxX = -1, maxY = -1
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (px[y * stride + x * bpp + 3] >= ALPHA) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}
if (maxX < 0) throw new Error("image is fully transparent")

// small breathing-room pad so strokes aren't flush to the edge
const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.03)
minX = Math.max(0, minX - pad)
minY = Math.max(0, minY - pad)
maxX = Math.min(width - 1, maxX + pad)
maxY = Math.min(height - 1, maxY + pad)
const cw = maxX - minX + 1
const ch = maxY - minY + 1

// --- crop + re-encode (filter type 0 per row) ---
const cropStride = cw * bpp
const out = Buffer.alloc(ch * (cropStride + 1))
let wp = 0
for (let y = 0; y < ch; y++) {
  out[wp++] = 0 // filter: None
  px.copy(out, wp, (minY + y) * stride + minX * bpp, (minY + y) * stride + (minX + cw) * bpp)
  wp += cropStride
}
const compressed = deflateSync(out, { level: 9 })

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, "ascii")
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

const newIhdr = Buffer.alloc(13)
newIhdr.writeUInt32BE(cw, 0)
newIhdr.writeUInt32BE(ch, 4)
newIhdr.writeUInt8(8, 8)   // bit depth
newIhdr.writeUInt8(6, 9)   // color type RGBA
newIhdr.writeUInt8(0, 10)  // compression
newIhdr.writeUInt8(0, 11)  // filter
newIhdr.writeUInt8(0, 12)  // interlace

const png = Buffer.concat([
  sig,
  chunk("IHDR", newIhdr),
  chunk("IDAT", compressed),
  chunk("IEND", Buffer.alloc(0)),
])
writeFileSync(OUT, png)

console.log(`source : ${width}x${height}`)
console.log(`content: x[${minX}..${maxX}] y[${minY}..${maxY}]`)
console.log(`cropped: ${cw}x${ch}  (aspect ${(cw / ch).toFixed(3)})  ${(png.length / 1024).toFixed(1)} KB`)
