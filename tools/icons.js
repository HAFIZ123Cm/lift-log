// Draws the app icon (white dumbbell on orange) as PNGs with no dependencies.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, inside){
  const SS = 4, raw = Buffer.alloc((size * 4 + 1) * size);
  const bg = [0xea, 0x58, 0x0c], fg = [255, 255, 255];
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        if (inside((x + (sx + .5) / SS) / size, (y + (sy + .5) / SS) / size)) hit++;
      }
      const a = hit / (SS * SS), o = y * (size * 4 + 1) + 1 + x * 4;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(bg[i] + (fg[i] - bg[i]) * a);
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
// Dumbbell kept inside the maskable safe zone (centre 80%)
function rect(u, v, x0, x1, y0, y1, r){
  const cx = Math.max(x0 + r, Math.min(x1 - r, u)), cy = Math.max(y0 + r, Math.min(y1 - r, v));
  return Math.hypot(u - cx, v - cy) <= r && u >= x0 && u <= x1 && v >= y0 && v <= y1;
}
function dumbbell(u, v){
  return rect(u, v, 0.30, 0.70, 0.475, 0.525, 0.01) ||   // bar
    rect(u, v, 0.27, 0.34, 0.32, 0.68, 0.02) ||           // left plate
    rect(u, v, 0.66, 0.73, 0.32, 0.68, 0.02) ||           // right plate
    rect(u, v, 0.215, 0.26, 0.38, 0.62, 0.015) ||         // left small plate
    rect(u, v, 0.74, 0.785, 0.38, 0.62, 0.015);           // right small plate
}
const out = path.join(__dirname, "..", "icons");
fs.mkdirSync(out, {recursive: true});
for (const [name, size] of [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
  fs.writeFileSync(path.join(out, name), png(size, dumbbell));
  console.log("wrote", name);
}
