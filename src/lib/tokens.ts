// Reads the custom properties of src/styles/tokens.css. Night starts from day and overrides it,
// the same way .dark overrides :root in the browser.

export type TokenSet = Record<string, string>;

function block(css: string, selector: string): TokenSet {
  const body = new RegExp(`${selector}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
  );
}

export function parseTokens(css: string): { day: TokenSet; night: TokenSet } {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const day = block(plain, ":root");
  return { day, night: { ...day, ...block(plain, "\\.dark") } };
}
