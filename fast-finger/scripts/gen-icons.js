const fs = require("fs");

fs.mkdirSync("public/icons", { recursive: true });
fs.mkdirSync("dist/icons", { recursive: true });

// Generate a minimal valid PNG programmatically (no external deps)
// PNG structure: signature + IHDR + IDAT + IEND
const zlib = require("zlib");

function createPNG(size, bgR, bgG, bgB, fgR, fgG, fgB) {
  // Draw a simple keyboard-like icon: colored square with rounded feel
  const pixels = [];
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Circle background
      if (dist <= r) {
        // Draw a simple keyboard shape in the center
        const relX = (x - cx) / r;
        const relY = (y - cy) / r;

        // Key grid: 3 rows x 4 cols of mini squares
        const gridX = (relX + 0.7) / 1.4;
        const gridY = (relY + 0.5) / 1.0;
        const col = Math.floor(gridX * 4);
        const row = Math.floor(gridY * 3);
        const cellX = (gridX * 4) % 1;
        const cellY = (gridY * 3) % 1;
        const inKey = cellX > 0.1 && cellX < 0.85 && cellY > 0.1 && cellY < 0.8;
        const inGrid = gridX >= 0 && gridX <= 1 && gridY >= 0 && gridY <= 1;

        if (inGrid && inKey && row >= 0 && row < 3 && col >= 0 && col < 4) {
          pixels.push(fgR, fgG, fgB, 255);
        } else {
          pixels.push(bgR, bgG, bgB, 255);
        }
      } else {
        pixels.push(0, 0, 0, 0); // transparent
      }
    }
  }

  // Build PNG
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Raw image data (filter byte 0 per scanline)
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter type None
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      raw.push(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(raw));

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, "ascii");
    const crcInput = Buffer.concat([typeB, data]);
    const crc = crc32(crcInput);
    const crcB = Buffer.alloc(4);
    crcB.writeInt32BE(crc);
    return Buffer.concat([len, typeB, data, crcB]);
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (const byte of buf) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
      }
    }
    return (crc ^ 0xffffffff) | 0;
  }

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const sizes = [16, 48, 128];
sizes.forEach((s) => {
  // bg: #1a1a2e (26,26,46)  fg: #a48cf4 (164,140,244)
  const buf = createPNG(s, 26, 26, 46, 164, 140, 244);
  fs.writeFileSync(`public/icons/icon${s}.png`, buf);
  fs.writeFileSync(`dist/icons/icon${s}.png`, buf);
  console.log(`icon${s}.png — ${buf.length} bytes`);
});
