import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("public/icons", { recursive: true });

// Radar ring + tent — larger, simplified single ring for legibility at small sizes.
const icon = (size, { bleed = false } = {}) => {
  const bg = bleed ? `<rect width="100" height="100" fill="#12140f"/>` : `<rect width="100" height="100" rx="22" fill="#12140f"/>`;
  const ringR = bleed ? 34 : 40;
  const tent = bleed
    ? `<path d="M50 26 L74 66 H26 Z" fill="#f4a35c"/>`
    : `<path d="M50 20 L78 68 H22 Z" fill="#f4a35c"/>`;
  return `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  ${bg}
  <circle cx="50" cy="50" r="${ringR}" fill="none" stroke="#f4a35c" stroke-width="2.5" opacity="0.55"/>
  ${tent}
  <circle cx="50" cy="68" r="3" fill="#eef0ea"/>
</svg>`;
};

const targets = [
  { size: 192, file: "public/icons/icon-192.png" },
  { size: 512, file: "public/icons/icon-512.png" },
  { size: 180, file: "public/icons/apple-touch-icon.png" },
];

for (const { size, file } of targets) {
  await sharp(Buffer.from(icon(size))).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}

await sharp(Buffer.from(icon(512, { bleed: true })))
  .resize(512, 512)
  .png()
  .toFile("public/icons/icon-maskable-512.png");
console.log("wrote public/icons/icon-maskable-512.png");

// favicon.ico: pack 16/32/48 PNGs into a single multi-size ICO (modern PNG-in-ICO format)
const icoSizes = [16, 32, 48];
const pngBuffers = await Promise.all(
  icoSizes.map((size) => sharp(Buffer.from(icon(size))).resize(size, size).png().toBuffer())
);

const headerSize = 6 + 16 * icoSizes.length;
let offset = headerSize;
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(icoSizes.length, 4); // image count

const dirEntries = [];
icoSizes.forEach((size, i) => {
  const buf = pngBuffers[i];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // color palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(buf.length, 8); // size of image data
  entry.writeUInt32LE(offset, 12); // offset of image data
  offset += buf.length;
  dirEntries.push(entry);
});

const ico = Buffer.concat([header, ...dirEntries, ...pngBuffers]);
writeFileSync("src/app/favicon.ico", ico);
console.log("wrote src/app/favicon.ico");
