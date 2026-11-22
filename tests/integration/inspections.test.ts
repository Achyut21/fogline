import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/server/db/client";
import { inspectionSql } from "../../scripts/grades/inspections";
import { createScratchDatabase } from "./scratch-database";

const testUrl = process.env.DATABASE_URL_TEST ?? "";

type Row = [license: string, status: string, result: string, at: string, violStatus?: string];

// The same columns as Analyze Boston's inspections table, so the SQL sent to its datastore runs
// here unchanged. Times are text with a +00 offset, like the source.
const rows: Row[] = [
  ["fail-then-pass", "Active", "HE_Fail", "2026-06-01 14:00:00+00", "Fail"],
  ["fail-then-pass", "Active", "HE_Pass", "2026-06-09 14:00:00+00", "Pass"],
  ["closure-then-pass", "Active", "HE_VolClos", "2026-07-09 15:00:00+00", "Fail"],
  ["closure-then-pass", "Active", "HE_Pass", "2026-07-12 15:00:00+00"],
  ["far-apart", "Active", "HE_Pass", "2026-01-05 16:00:00+00"],
  ["far-apart", "Active", "HE_Fail", "2026-03-06 16:00:00+00", "Fail"],
  ["chain", "Active", "HE_Fail", "2026-05-01 13:00:00+00", "Fail"],
  ["chain", "Active", "HE_FailExt", "2026-05-20 13:00:00+00", "Fail"],
  ["chain", "Active", "HE_Pass", "2026-06-08 13:00:00+00"],
  ["not-required", "Active", "HE_NotReq", "2026-06-01 12:00:00+00"],
  ["not-required", "Active", "HE_Pass", "2026-06-10 12:00:00+00"],
  ["inactive", "Inactive", "HE_Pass", "2026-06-10 12:00:00+00"],
  ["late-evening", "Active", "HE_Pass", "2026-08-02 02:30:00+00"],
];

describe.skipIf(testUrl === "")("latest routine inspection SQL (DATA 3.6)", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    await db.execute(sql`create table inspections (
      _id serial primary key, licenseno text, licstatus text, result text, resultdttm text,
      businessname text, address text, location text, viol_level text, viol_status text,
      violdesc text, comments text)`);
    await db.execute(sql`insert into inspections
      (licenseno, licstatus, result, resultdttm, viol_level, viol_status, violdesc)
      values ${sql.join(
        rows.map(
          ([license, status, result, at, violStatus]) =>
            sql`(${license}, ${status}, ${result}, ${at}, ${violStatus ? "**" : null}, ${violStatus ?? null}, ${violStatus ? "Cold holding" : null})`,
        ),
        sql`, `,
      )}`);
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F11.1] picks each active license's latest inspection with none in the 30 days before it", async () => {
    const found = await db.execute<{ licenseno: string; at: string; viol_status: string | null }>(
      sql.raw(inspectionSql("inspections", 0)),
    );
    expect(found.map((r) => `${r.licenseno} ${r.at} ${r.viol_status ?? "-"}`).sort()).toEqual([
      "chain 2026-05-01 Fail",
      "closure-then-pass 2026-07-09 Fail",
      "fail-then-pass 2026-06-01 Fail",
      "far-apart 2026-03-06 Fail",
      "late-evening 2026-08-01 -",
      "not-required 2026-06-10 -",
    ]);
  });
});
