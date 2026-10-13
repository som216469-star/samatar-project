const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Quantora's Q mark is generated from geometry, not a separately maintained
// bitmap, so every web and native icon stays consistent with public/brand-mark.svg.
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[i] = c;
}

function crc32(buffer) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) c = crcTable[(c ^ buffer[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function quantoraCyan(y, width) {
  const t = clamp((y - width * 0.17) / (width * 0.66));
  const top = [18, 245, 239];
  const middle = [18, 201, 245];
  const bottom = [7, 136, 255];
  if (t < 0.52) {
    const u = t / 0.52;
    return [lerp(top[0], middle[0], u), lerp(top[1], middle[1], u), lerp(top[2], middle[2], u)];
  }
  const u = (t - 0.52) / 0.48;
  return [lerp(middle[0], bottom[0], u), lerp(middle[1], bottom[1], u), lerp(middle[2], bottom[2], u)];
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0], yi = points[i][1];
    const xj = points[j][0], yj = points[j][1];
    const crosses = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (crosses) inside = !inside;
  }
  return inside;
}

function createPNG(width, height, fullBleed = true, launcherFrame = false) {
  // 3x3 supersampling makes the circular strokes smooth even for small favicons.
  const samples = 3;
  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(rowStride * height);
  const cx = width / 2;
  const cy = height / 2;
  const scale = width / 512;
  // Give the Q mark extra breathing room inside the rounded navy app tile.
  // Keep the standalone logo SVG unchanged; only installed-app/PWA icons shrink.
  const launcherMarkScale = launcherFrame ? 0.82 : 1;
  const outerRadius = 169 * scale * launcherMarkScale;
  const outerStroke = 24 * scale * launcherMarkScale;
  // The reference logo's inner ring is about 57% of the outer ring diameter.
  const innerRadius = 96 * scale * launcherMarkScale;
  const innerCy = (256 + (250 - 256) * launcherMarkScale) * scale;
  const innerStroke = 22 * scale * launcherMarkScale;
  const slash = [[237, 238], [255, 220], [426, 391], [408, 409]].map(([x, y]) => [
    (256 + (x - 256) * launcherMarkScale) * scale,
    (256 + (y - 256) * launcherMarkScale) * scale
  ]);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // PNG filter: None
    for (let x = 0; x < width; x++) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          const dx = px - cx;
          const dy = py - cy;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Deep navy background with a discreet blue glow behind the Q.
          const glow = clamp(1 - distance / (width * 0.50)) * 0.24;
          let r = Math.round(3 + 3 * glow);
          let g = Math.round(16 + 27 * glow);
          let b = Math.round(33 + 34 * glow);
          let alpha = 255;

          // Older browser icons may use transparent, rounded corners. Maskable
          // and native app icons use a full-bleed dark background.
          if (!fullBleed) {
            const corner = width * 0.22;
            const qx = Math.max(0, Math.abs(dx) - (cx - corner));
            const qy = Math.max(0, Math.abs(dy) - (cy - corner));
            if (Math.sqrt(qx * qx + qy * qy) > corner) alpha = 0;
          }

          if (alpha > 0) {
            // Draw a dark navy rounded-square tile inset from the outer dark canvas.
            // This matches the provided home-screen icon reference without a bright cyan frame.
            if (launcherFrame) {
              const inset = width * 0.045;
              const halfW = cx - inset;
              const halfH = cy - inset;
              const corner = width * 0.19;
              const rx = Math.abs(dx) - (halfW - corner);
              const ry = Math.abs(dy) - (halfH - corner);
              const roundedRectDistance =
                Math.sqrt(Math.max(rx, 0) ** 2 + Math.max(ry, 0) ** 2) +
                Math.min(Math.max(rx, ry), 0) - corner;
              const insideTile = roundedRectDistance <= 0;
              if (insideTile) {
                const edgeGlow = clamp(1 - Math.abs(roundedRectDistance) / (width * 0.08));
                r = Math.round(6 + 2 * edgeGlow);
                g = Math.round(24 + 7 * edgeGlow);
                b = Math.round(43 + 9 * edgeGlow);
              }
            }

            const outerDistance = Math.abs(distance - outerRadius);
            const innerDx = px - cx;
            const innerDy = py - innerCy;
            const innerDistance = Math.sqrt(innerDx * innerDx + innerDy * innerDy);
            const isOuter = outerDistance <= outerStroke / 2;
            const isInner = innerDistance <= innerRadius + innerStroke / 2
              && innerDistance >= innerRadius - innerStroke / 2;
            const isSlash = pointInPolygon(px, py, slash);

            // Match the official double-ring Q mark used in the approved icon reference.
            if (isOuter) [r, g, b] = quantoraCyan(py, height);
            if (isInner) [r, g, b] = quantoraCyan(py, height);
            if (isSlash) [r, g, b] = quantoraCyan(py, height);
          }

          sumR += r * alpha / 255;
          sumG += g * alpha / 255;
          sumB += b * alpha / 255;
          sumA += alpha;
        }
      }

      const pixel = rowOffset + 1 + x * 4;
      const count = samples * samples;
      rawData[pixel] = Math.round(sumR / count);
      rawData[pixel + 1] = Math.round(sumG / count);
      rawData[pixel + 2] = Math.round(sumB / count);
      rawData[pixel + 3] = Math.round(sumA / count);
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function createICO() {
  const sizes = [16, 32, 48];
  const images = sizes.map((size) => createPNG(size, size, true));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = Buffer.alloc(images.length * 16);
  let offset = header.length + entries.length;
  images.forEach((image, index) => {
    const entry = index * 16;
    const size = sizes[index];
    entries[entry] = size === 256 ? 0 : size;
    entries[entry + 1] = size === 256 ? 0 : size;
    entries[entry + 2] = 0;
    entries[entry + 3] = 0;
    entries.writeUInt16LE(1, entry + 4);
    entries.writeUInt16LE(32, entry + 6);
    entries.writeUInt32LE(image.length, entry + 8);
    entries.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  return Buffer.concat([header, entries, ...images]);
}

const root = path.join(__dirname, '..');
const iconOutputs = [
  { file: 'public/pwa-192x192.png', size: 192, fullBleed: true },
  { file: 'public/pwa-512x512.png', size: 512, fullBleed: true },
  { file: 'public/pwa-maskable-512x512.png', size: 512, fullBleed: true },
  { file: 'public/apple-touch-icon.png', size: 180, fullBleed: true },
  { file: 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png', size: 48, fullBleed: true },
  { file: 'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png', size: 48, fullBleed: true },
  { file: 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png', size: 72, fullBleed: true },
  { file: 'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png', size: 72, fullBleed: true },
  { file: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png', size: 96, fullBleed: true },
  { file: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png', size: 96, fullBleed: true },
  { file: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png', size: 144, fullBleed: true },
  { file: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png', size: 144, fullBleed: true },
  { file: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', size: 192, fullBleed: true },
  { file: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png', size: 192, fullBleed: true },
  { file: 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', size: 1024, fullBleed: true }
];

for (const icon of iconOutputs) {
  const outputPath = path.join(root, icon.file);
  if (icon.file.startsWith('android/') || icon.file.startsWith('ios/')) {
    if (!fs.existsSync(path.dirname(outputPath))) continue;
  }
  const buffer = createPNG(icon.size, icon.size, icon.fullBleed, true);
  fs.writeFileSync(outputPath, buffer);
  console.log('Generated ' + icon.file + ' (' + icon.size + 'x' + icon.size + ', ' + buffer.length + ' bytes)');
}

const faviconPath = path.join(root, 'public', 'favicon.ico');
const icoBuffer = createICO();
fs.writeFileSync(faviconPath, icoBuffer);
console.log('Generated public/favicon.ico (' + icoBuffer.length + ' bytes)');
