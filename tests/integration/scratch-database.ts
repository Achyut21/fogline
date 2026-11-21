import { sql } from "drizzle-orm";
import { createDb } from "@/server/db/client";

// A fresh database copied from template0, which has no TimescaleDB extension even when the
// server image installs it into template1.
export async function createScratchDatabase(adminUrl: string) {
  const name = `scratch_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = createDb(adminUrl);
  await admin.execute(sql.raw(`create database ${name} template template0`));
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return {
    url: url.toString(),
    async drop() {
      await admin.execute(sql.raw(`drop database if exists ${name} with (force)`));
      await admin.$client.end();
    },
  };
}
