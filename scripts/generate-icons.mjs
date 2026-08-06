import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("public/icons", { recursive: true });

const svg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="22" fill="#12140f"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="#2b3530" stroke-width="2"/>
  <circle cx="50" cy="50" r="26" fill="none" stroke="#2b3530" stroke-width="2" stroke-dasharray="4 3"/>
  <path d="M50 24 L74 66 H26 Z" fill="#f4a35c"/>
  <circle cx="50" cy="50" r="3.2" fill="#eef0ea"/>
</svg>`;

const sizes = [
  { size: 192, file: "public/icons/icon-192.png" },
  { size: 512, file: "public/icons/icon-512.png" },
  { size: 180, file: "public/icons/apple-touch-icon.png" },
];

for (const { size, file } of sizes) {
  await sharp(Buffer.from(svg(size))).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}

// maskable icon: same design but with more padding so safe-area isn't clipped
const maskableSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#12140f"/>
  <circle cx="50" cy="50" r="30" fill="none" stroke="#2b3530" stroke-width="2"/>
  <path d="M50 30 L68 62 H32 Z" fill="#f4a35c"/>
  <circle cx="50" cy="50" r="2.6" fill="#eef0ea"/>
</svg>`;
await sharp(Buffer.from(maskableSvg(512))).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");
console.log("wrote public/icons/icon-maskable-512.png");
