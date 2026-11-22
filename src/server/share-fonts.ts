import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Hanken Grotesk for share images (D-070). next/og takes ttf, otf or woff, so the static TTFs are
// vendored in assets/fonts/ (OFL) and traced into the functions that read them.
const weights = [400, 700, 800] as const;

export const shareFonts = await Promise.all(
  weights.map(async (weight) => ({
    name: "Hanken Grotesk",
    weight,
    style: "normal" as const,
    data: await readFile(join(process.cwd(), `assets/fonts/hanken-grotesk-${weight}.ttf`)),
  })),
);
