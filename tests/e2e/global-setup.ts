import { mkdir } from "node:fs/promises";
import path from "node:path";
import { request } from "@playwright/test";
import { bypassStatePath, deploymentURL } from "./deployment-url";

// Trade the protection-bypass secret for Vercel's bypass cookie once, so tests never send the
// secret themselves, and mask the cookie in GitHub Actions logs.
export default async function globalSetup() {
  const baseURL = deploymentURL();
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!baseURL || !secret) return;

  const context = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  const response = await context.get("/");
  if (!response.ok()) throw new Error(`Deployment bypass failed with HTTP ${response.status()}`);

  await mkdir(path.dirname(bypassStatePath), { recursive: true });
  const state = await context.storageState({ path: bypassStatePath });
  for (const cookie of state.cookies) process.stdout.write(`::add-mask::${cookie.value}\n`);
  await context.dispose();
}
