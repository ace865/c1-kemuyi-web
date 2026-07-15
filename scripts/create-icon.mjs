import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "build", "icon.ico");
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = sizes.map(createDib);
const headerSize = 6 + sizes.length * 16;
const header = Buffer.alloc(headerSize);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);

let offset = headerSize;
images.forEach((image, index) => {
  const size = sizes[index];
  const entry = 6 + index * 16;
  header.writeUInt8(size === 256 ? 0 : size, entry);
  header.writeUInt8(size === 256 ? 0 : size, entry + 1);
  header.writeUInt8(0, entry + 2);
  header.writeUInt8(0, entry + 3);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, Buffer.concat([header, ...images]));
console.log(`Windows 图标已生成：${output}`);

function createDib(size) {
  const xorSize = size * size * 4;
  const maskRowBytes = Math.ceil(size / 32) * 4;
  const maskSize = maskRowBytes * size;
  const dib = Buffer.alloc(40 + xorSize + maskSize);
  dib.writeUInt32LE(40, 0);
  dib.writeInt32LE(size, 4);
  dib.writeInt32LE(size * 2, 8);
  dib.writeUInt16LE(1, 12);
  dib.writeUInt16LE(32, 14);
  dib.writeUInt32LE(xorSize, 20);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sourceY = size - 1 - y;
      const pixel = 40 + (y * size + x) * 4;
      const alpha = insideRoundedSquare(x, sourceY, size) ? 255 : 0;
      const white = alpha && insideGlyph(x, sourceY, size);
      const color = white ? 255 : 17;
      dib[pixel] = color;
      dib[pixel + 1] = color;
      dib[pixel + 2] = color;
      dib[pixel + 3] = alpha;
    }
  }
  return dib;
}

function insideRoundedSquare(x, y, size) {
  const margin = size * 0.04;
  const radius = size * 0.22;
  if (x < margin || y < margin || x >= size - margin || y >= size - margin) return false;
  const nearestX = Math.max(margin + radius, Math.min(x, size - margin - radius));
  const nearestY = Math.max(margin + radius, Math.min(y, size - margin - radius));
  return (x - nearestX) ** 2 + (y - nearestY) ** 2 <= radius ** 2;
}

function insideGlyph(x, y, size) {
  const sx = x / size;
  const sy = y / size;
  const thick = 0.075;
  const c = sx >= 0.18 && sx <= 0.55 && sy >= 0.25 && sy <= 0.75
    && (sx <= 0.18 + thick || sy <= 0.25 + thick || sy >= 0.75 - thick)
    && !(sx > 0.47 && sy > 0.34 && sy < 0.66);
  const one = sx >= 0.68 && sx <= 0.76 && sy >= 0.25 && sy <= 0.75;
  const oneCap = sx >= 0.61 && sx <= 0.76 && sy >= 0.25 && sy <= 0.34;
  const oneBase = sx >= 0.61 && sx <= 0.83 && sy >= 0.67 && sy <= 0.75;
  return c || one || oneCap || oneBase;
}
