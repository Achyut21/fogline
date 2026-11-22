// Browser chrome colors for the manifest and the theme-color meta tags, which need literal
// colors (D-043). They equal --bg in src/styles/tokens.css; a unit test keeps them equal.
export const themeColor = {
  day: "#f4f5f7",
  night: "#0e1013",
} as const;
