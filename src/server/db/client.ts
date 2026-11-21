import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { log } from "@/lib/log";

// Tiger's connection pooler can't keep prepared statements across transactions, and each
// serverless instance should hold only a few connections. query_timeout covers waiting for a
// connection too, so a stalled pooler fails fast instead of hanging until the function times out.
export function createDb(url: string) {
  const client = postgres(url, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    query_timeout: 15,
    onnotice: (notice) =>
      log.info("postgres notice", { code: notice.code ?? null, message: notice.message ?? null }),
  });
  return drizzle({ client });
}

export type Db = ReturnType<typeof createDb>;

let shared: Db | undefined;

export function getDb(): Db {
  if (!shared) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    shared = createDb(url);
  }
  return shared;
}
