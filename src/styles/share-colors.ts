// Colors for the recap share image (F9.3). ImageResponse can't read CSS variables, so these are
// literal copies of the day theme in src/styles/tokens.css; a unit test keeps them equal (D-043).
export const shareColors = {
  bg: "#f4f5f7",
  surface: "#ffffff",
  sunken: "#eef1f4",
  ink: "#15181c",
  inkMuted: "#5b636d",
  accent: "#0b7a75",
} as const;
