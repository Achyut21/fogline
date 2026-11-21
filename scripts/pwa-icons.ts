import sharp from "sharp";

// Placeholder artwork until Phase 1. The shapes sit inside the central 80% so the same
// file works as a maskable icon.
const source = "public/icons/icon.svg";
const outputs = [
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
  { file: "public/icons/apple-touch-icon.png", size: 180 },
];

for (const { file, size } of outputs) {
  await sharp(source, { density: 300 }).resize(size, size).png().toFile(file);
}
