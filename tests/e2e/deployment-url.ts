// PLAYWRIGHT_BASE_URL is set by the deployment workflow to test a Vercel deployment instead of
// a local build. Vercel sends it without a scheme. Only this project's own deployments may
// receive the protection-bypass secret, and only over HTTPS.
const ownHost =
  /^(fogline-mu\.vercel\.app|fogline-[a-z0-9-]+-achyut-katiyars-projects\.vercel\.app)$/;

export function deploymentURL(raw = process.env.PLAYWRIGHT_BASE_URL) {
  if (!raw) return undefined;
  const url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (url.protocol !== "https:" || !ownHost.test(url.hostname)) {
    throw new Error(`Refusing to test ${url.origin}: not an HTTPS Fogline deployment on Vercel`);
  }
  return url.origin;
}

export const bypassStatePath = "playwright/.auth/deployment.json";
