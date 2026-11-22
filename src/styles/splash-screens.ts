// The iPhone screens that get a splash screen (PWA.md): CSS size and pixel ratio, portrait.
export const splashScreens = [
  { width: 440, height: 956, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 375, height: 667, ratio: 2 },
] as const;

/** The `apple-touch-startup-image` links, one per screen and theme. */
export const startupImages = splashScreens.flatMap(({ width, height, ratio }) =>
  (["day", "night"] as const).map((theme) => ({
    url: `/splash/${width}x${height}@${ratio}-${theme}.png`,
    media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (prefers-color-scheme: ${theme === "day" ? "light" : "dark"})`,
  })),
);
