import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";
import { request } from "@playwright/test";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "@/server/db/client";
import { bypassStatePath, deploymentURL } from "./deployment-url";

// A local run's server writes profiles to the throwaway test database, so its tables must exist.
async function migrateTestDatabase() {
  const fileEnv = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {};
  const url = process.env.DATABASE_URL_TEST ?? fileEnv.DATABASE_URL_TEST;
  if (!url) return;
  const db = createDb(url);
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.$client.end();
}

// Trade the protection-bypass secret for Vercel's bypass cookie once, so tests never send the
// secret themselves, and mask the cookie in GitHub Actions logs.
export default async function globalSetup() {
  const baseURL = deploymentURL();
  if (!baseURL) {
    await migrateTestDatabase();
    return;
  }
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return;

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
