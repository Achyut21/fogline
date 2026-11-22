import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { splashScreens } from "@/styles/splash-screens";
import { themeColor } from "@/styles/theme-color";

// iOS splash screens (PWA.md): the app icon centered on the app's background, one per current
// iPhone screen in portrait (the manifest locks portrait), in day and night. iOS picks the one
// whose media query matches; `src/app/layout.tsx` lists them from the same table.
const icon = "public/icons/icon.svg";
await mkdir("public/splash", { recursive: true });

for (const screen of splashScreens) {
  const width = screen.width * screen.ratio;
  const height = screen.height * screen.ratio;
  const side = Math.round(width * 0.32);
  const art = await sharp(icon, { density: 600 }).resize(side, side).png().toBuffer();
  for (const theme of ["day", "night"] as const) {
    await sharp({
      create: { width, height, channels: 3, background: themeColor[theme] },
    })
      .composite([{ input: art, gravity: "center" }])
      .png()
      .toFile(`public/splash/${screen.width}x${screen.height}@${screen.ratio}-${theme}.png`);
  }
}
