/**
 * Generate 16x16 Minecraft-style block texture PNGs using only Node.js built-ins.
 * Outputs to public/textures/blocks/
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZE = 16;
const OUT_DIR = path.join(__dirname, '..', 'public', 'textures', 'blocks');

fs.mkdirSync(OUT_DIR, { recursive: true });

// --- PNG encoder (minimal, no dependencies) ---

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createPNG(pixels) {
  // pixels: Uint8Array of SIZE*SIZE*4 (RGBA)
  // Build raw image data with filter byte per row
  const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
  for (let y = 0; y < SIZE; y++) {
    raw[y * (1 + SIZE * 4)] = 0; // filter: None
    for (let x = 0; x < SIZE; x++) {
      const srcIdx = (y * SIZE + x) * 4;
      const dstIdx = y * (1 + SIZE * 4) + 1 + x * 4;
      raw[dstIdx] = pixels[srcIdx];
      raw[dstIdx + 1] = pixels[srcIdx + 1];
      raw[dstIdx + 2] = pixels[srcIdx + 2];
      raw[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  const compressed = zlib.deflateSync(raw);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crcVal = crc32(typeAndData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeAndData, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Color utilities ---

function rgba(r, g, b, a = 255) { return [r, g, b, a]; }

function colorVariant(base, variance) {
  return base.map((c, i) => i === 3 ? c : Math.max(0, Math.min(255, c + Math.floor((Math.random() - 0.5) * 2 * variance))));
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

function makeTexture(seed, fn) {
  const rand = seededRandom(seed);
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b, a] = fn(x, y, rand);
      const idx = (y * SIZE + x) * 4;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = a;
    }
  }
  return pixels;
}

// --- Texture definitions ---

const textures = {
  // Grass top: rich green with variation
  grass_top: makeTexture(100, (x, y, rand) => {
    const base = [89, 135, 58];
    const v = Math.floor((rand() - 0.5) * 30);
    const dark = rand() < 0.12;
    return rgba(
      base[0] + v - (dark ? 20 : 0),
      base[1] + v - (dark ? 15 : 0),
      base[2] + v - (dark ? 18 : 0)
    );
  }),

  // Grass side: green strip on top, dirt body
  grass_side: makeTexture(200, (x, y, rand) => {
    if (y <= 2) {
      // Green grass top edge
      const v = Math.floor((rand() - 0.5) * 20);
      const hangDown = (y === 2) && rand() < 0.4;
      if (y < 2 || !hangDown) {
        return rgba(89 + v, 135 + v, 58 + v);
      }
    }
    if (y === 3 && rand() < 0.25) {
      // Occasional green dangle
      const v = Math.floor((rand() - 0.5) * 15);
      return rgba(89 + v, 130 + v, 55 + v);
    }
    // Dirt body
    const base = [134, 96, 67];
    const v = Math.floor((rand() - 0.5) * 25);
    const spot = rand() < 0.08;
    return rgba(
      base[0] + v + (spot ? -20 : 0),
      base[1] + v + (spot ? -15 : 0),
      base[2] + v + (spot ? -12 : 0)
    );
  }),

  // Dirt: brown with grain
  dirt: makeTexture(300, (x, y, rand) => {
    const base = [134, 96, 67];
    const v = Math.floor((rand() - 0.5) * 30);
    const spot = rand() < 0.1;
    return rgba(
      base[0] + v + (spot ? -25 : 0),
      base[1] + v + (spot ? -18 : 0),
      base[2] + v + (spot ? -15 : 0)
    );
  }),

  // Stone: grey with cracks and variation
  stone: makeTexture(400, (x, y, rand) => {
    const base = [125, 125, 125];
    const v = Math.floor((rand() - 0.5) * 25);
    // Crack-like dark lines
    const crack = ((x + y * 3) % 7 === 0 && rand() < 0.4) || ((x * 2 + y) % 11 === 0 && rand() < 0.3);
    const shade = crack ? -35 : 0;
    // Occasional lighter spots (mineral)
    const light = rand() < 0.06 ? 20 : 0;
    return rgba(base[0] + v + shade + light, base[1] + v + shade + light, base[2] + v + shade + light);
  }),

  // Wood log top: concentric rings
  wood_top: makeTexture(500, (x, y, rand) => {
    const cx = 7.5, cy = 7.5;
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const ring = Math.floor(dist * 1.3) % 3;
    const v = Math.floor((rand() - 0.5) * 12);
    if (ring === 0) return rgba(180 + v, 144 + v, 97 + v); // Light wood
    if (ring === 1) return rgba(150 + v, 114 + v, 70 + v); // Dark ring
    return rgba(168 + v, 132 + v, 88 + v); // Medium
  }),

  // Wood log side: bark with vertical lines
  wood_side: makeTexture(600, (x, y, rand) => {
    const base = [102, 76, 51];
    const v = Math.floor((rand() - 0.5) * 18);
    // Vertical bark lines
    const stripe = (x % 4 === 0 || x % 4 === 1) ? -12 : 8;
    // Horizontal cracks
    const hcrack = (y % 6 === 0) ? -10 : 0;
    return rgba(base[0] + v + stripe + hcrack, base[1] + v + stripe + hcrack, base[2] + v + stripe + hcrack);
  }),

  // Brick: red bricks with mortar
  brick: makeTexture(700, (x, y, rand) => {
    // Mortar lines
    const row = Math.floor(y / 4);
    const isHMortar = (y % 4 === 0);
    const offset = (row % 2 === 0) ? 0 : 8;
    const isVMortar = ((x + offset) % 8 === 0);

    if (isHMortar || isVMortar) {
      // Mortar: light grey
      const v = Math.floor((rand() - 0.5) * 15);
      return rgba(180 + v, 175 + v, 165 + v);
    }
    // Brick: red-brown
    const v = Math.floor((rand() - 0.5) * 20);
    const shade = rand() < 0.15 ? -15 : 0;
    return rgba(156 + v + shade, 82 + v + shade, 67 + v + shade);
  }),

  // Leaves: dark green with varied transparency look
  leaves: makeTexture(800, (x, y, rand) => {
    const isHole = rand() < 0.15;
    if (isHole) {
      // Darker gap (simulates seeing through leaves)
      return rgba(30, 60, 25, 200);
    }
    const v = Math.floor((rand() - 0.5) * 35);
    const bright = rand() < 0.15 ? 20 : 0;
    return rgba(46 + v + bright, 125 + v + bright, 50 + v + bright, 240);
  }),

  // Water: blue with wave-like pattern
  water: makeTexture(900, (x, y, rand) => {
    const wave = Math.sin((x + y * 0.5) * 0.8) * 15;
    const v = Math.floor((rand() - 0.5) * 12);
    return rgba(
      Math.floor(40 + wave + v),
      Math.floor(130 + wave + v),
      Math.floor(200 + wave * 0.5 + v),
      180
    );
  }),

  // Obsidian: very dark with purple sheen and rare bright specks
  obsidian: makeTexture(1000, (x, y, rand) => {
    const base = [20, 15, 30];
    const v = Math.floor((rand() - 0.5) * 10);
    // Purple sheen streaks
    const sheen = ((x + y) % 5 === 0) ? 12 : 0;
    // Rare bright specks
    const speck = rand() < 0.04 ? 60 : 0;
    return rgba(
      base[0] + v + sheen * 0.5 + speck,
      base[1] + v + speck * 0.5,
      base[2] + v + sheen + speck
    );
  }),

  // Sand: light beige with grain
  sand: makeTexture(1100, (x, y, rand) => {
    const base = [219, 211, 176];
    const v = Math.floor((rand() - 0.5) * 20);
    const spot = rand() < 0.08 ? -15 : 0;
    return rgba(base[0] + v + spot, base[1] + v + spot, base[2] + v + spot);
  }),
};

// --- Write files ---

for (const [name, pixels] of Object.entries(textures)) {
  const png = createPNG(pixels);
  const filePath = path.join(OUT_DIR, `${name}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created: ${filePath} (${png.length} bytes)`);
}

console.log('\nAll textures generated successfully!');
