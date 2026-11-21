import { sql } from "drizzle-orm";
import type { Db } from "./client";

export async function timescaleVersion(db: Db): Promise<string | null> {
  const rows = await db.execute<{ extversion: string }>(
    sql`select extversion from pg_extension where extname = 'timescaledb'`,
  );
  return rows[0]?.extversion ?? null;
}
