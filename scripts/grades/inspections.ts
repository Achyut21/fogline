import { z } from "zod";
import type { LatLon } from "@/lib/geo/distance";
import { gradeFor, inspectionPoints, type Establishment, type ViolationLevel } from "@/lib/grades";
import { violationLevels, type InspectionGrade } from "@/lib/places/types";

// Analyze Boston's Food Establishment Inspections (CKAN datastore, no key), read with SQL so only
// each active establishment's latest routine inspection comes back (D-061).
const resource = "4582bec6-2b4f-4f9e-bc55-cbaa73117f4c";
const endpoint = "https://data.boston.gov/api/3/action/datastore_search_sql";
const pageSize = 10_000;

/**
 * Results that record an inspection visit, closures included: a pass days after a closure is a
 * re-inspection, not a routine one. Left out: not required, out of business, miscellaneous, hold
 * and data-error rows.
 */
const inspectionResults = [
  "HE_Pass",
  "HE_Fail",
  "HE_FailExt",
  "HE_FAILNOR",
  "HE_Filed",
  "HE_Hearing",
  "HE_TSOP",
  "HE_VolClos",
  "HE_Closure",
  "NoViol",
  "Pass",
  "Fail",
];

export type InspectedEstablishment = Establishment & {
  date: string;
  violations: { level: ViolationLevel; text: string }[];
};

const rowSchema = z.object({
  licenseno: z.string(),
  at: z.string(),
  businessname: z.string().nullable(),
  address: z.string().nullable(),
  location: z.string().nullable(),
  viol_level: z.string().nullable(),
  viol_status: z.string().nullable(),
  violdesc: z.string().nullable(),
  comments: z.string().nullable(),
});
type Row = z.infer<typeof rowSchema>;

const responseSchema = z.object({
  success: z.boolean(),
  result: z.object({ records: z.array(rowSchema) }),
});

/**
 * The rows of each active license's latest routine inspection: the latest inspection with no
 * other inspection of that license in the 30 days before it, so a follow-up re-inspection that
 * marks violations corrected doesn't hide them (DATA 3.6). `table` is the quoted table name.
 */
export function inspectionSql(table: string, offset: number): string {
  const results = inspectionResults.map((r) => `'${r}'`).join(", ");
  return `WITH insp AS (
  SELECT DISTINCT licenseno, resultdttm::timestamptz AS at FROM ${table}
  WHERE licstatus = 'Active' AND result IN (${results})
), routine AS (
  SELECT i.licenseno, i.at FROM insp i WHERE NOT EXISTS (
    SELECT 1 FROM insp p WHERE p.licenseno = i.licenseno AND p.at < i.at AND p.at >= i.at - interval '30 days')
), latest AS (
  SELECT licenseno, max(at) AS at FROM routine GROUP BY licenseno
)
SELECT r.licenseno, to_char(l.at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD') AS at,
  r.businessname, r.address, r.location, r.viol_level, r.viol_status, r.violdesc, r.comments
FROM latest l JOIN ${table} r ON r.licenseno = l.licenseno AND r.resultdttm::timestamptz = l.at
ORDER BY r.licenseno, r._id
LIMIT ${pageSize} OFFSET ${offset}`;
}

export function parseLocation(text: string | null): LatLon | null {
  const match = /^\(\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*\)$/.exec(text ?? "");
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  return lat === 0 && lon === 0 ? null : { lat, lon };
}

export function parseAddress(text: string | null): { number: string; street: string } | null {
  const match = /^(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\s+(.+)$/.exec((text ?? "").trim());
  return match ? { number: match[1], street: match[2].replace(/\s+/g, " ") } : null;
}

function isLevel(value: string | null): value is ViolationLevel {
  return violationLevels.some((level) => level === value);
}

/**
 * One establishment per license, with the violations its latest routine inspection cited as
 * failed. A violation counts once per distinct inspector comment, and once when no row has one.
 */
export function toEstablishments(rows: Row[]): InspectedEstablishment[] {
  const byLicense = new Map<string, InspectedEstablishment>();
  const comments = new Map<string, Set<string>>();
  for (const row of rows) {
    let establishment = byLicense.get(row.licenseno);
    if (!establishment) {
      establishment = {
        license: row.licenseno,
        name: row.businessname ?? "",
        address: parseAddress(row.address),
        at: parseLocation(row.location),
        date: row.at,
        violations: [],
      };
      byLicense.set(row.licenseno, establishment);
    }
    if (row.viol_status === "Fail" && isLevel(row.viol_level) && row.violdesc) {
      const text = row.violdesc.trim().replace(/\s+/g, " ");
      const key = `${row.licenseno}|${row.viol_level}|${text}`;
      const seen = comments.get(key);
      const comment = row.comments?.trim() ?? "";
      if (!seen) {
        comments.set(key, new Set(comment ? [comment] : []));
        establishment.violations.push({ level: row.viol_level, text });
      } else if (comment && !seen.has(comment)) {
        if (seen.size > 0) establishment.violations.push({ level: row.viol_level, text });
        seen.add(comment);
      }
    }
  }
  return [...byLicense.values()];
}

export async function fetchInspections(): Promise<InspectedEstablishment[]> {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(endpoint);
    url.searchParams.set("sql", inspectionSql(`"${resource}"`, offset));
    const response = await fetch(url, { signal: AbortSignal.timeout(240_000) });
    if (!response.ok) throw new Error(`Analyze Boston answered ${response.status}`);
    const page = responseSchema.parse(await response.json()).result.records;
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return toEstablishments(rows);
}

const levelOrder = { "***": 0, "**": 1, "*": 2 } as const;

/** DATA 3.6: points from the cited violations, the letter, and the violations worst first. */
export function gradeOf(establishment: InspectedEstablishment): InspectionGrade {
  const points = inspectionPoints(establishment.violations.map((v) => v.level));
  return {
    letter: gradeFor(points),
    date: establishment.date,
    points,
    license: establishment.license,
    violations: [...establishment.violations].sort(
      (a, b) => levelOrder[a.level] - levelOrder[b.level] || a.text.localeCompare(b.text),
    ),
  };
}
