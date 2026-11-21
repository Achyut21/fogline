// PLAYWRIGHT_BASE_URL is set by the deployment workflow to test a Vercel deployment instead of
// a local build. Vercel sends it without a scheme.
export function deploymentURL(raw = process.env.PLAYWRIGHT_BASE_URL) {
  if (!raw) return undefined;
  return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
}

export const bypassStatePath = "playwright/.auth/deployment.json";
