import { eq } from "drizzle-orm";
import { cache } from "react";
import { revealAround } from "@/lib/geo/cells";
import type { Station } from "@/lib/gtfs/types";
import { getDb, type Db } from "@/server/db/client";
import { profiles, revealedCells, type ageBands } from "@/server/db/schema";
import { newProfileCode } from "./profile-code";
import { sessionProfileId } from "./session";

export type NewProfile = {
  name: string;
  school: string;
  home: Station;
  ageBand: (typeof ageBands)[number];
};

// F1.1 and F2.1: a new profile starts with the cells around its home station seen. A clash on
// the profile code draws a new one.
export async function insertProfile(db: Db, input: NewProfile) {
  const { cells, state } = revealAround("home", input.home);
  return db.transaction(async (tx) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const [row] = await tx
        .insert(profiles)
        .values({
          displayName: input.name,
          school: input.school,
          homeStationId: input.home.id,
          ageBand: input.ageBand,
          profileCode: newProfileCode(),
        })
        .onConflictDoNothing({ target: profiles.profileCode })
        .returning({ id: profiles.id, profileCode: profiles.profileCode });
      if (row) {
        await tx
          .insert(revealedCells)
          .values(cells.map((h3) => ({ profileId: row.id, h3, state, source: "home" as const })));
        return row;
      }
    }
    throw new Error("No free profile code after 3 tries");
  });
}

export async function profileIdByCode(db: Db, code: string) {
  const [row] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.profileCode, code))
    .limit(1);
  return row?.id ?? null;
}

/** The signed-in profile, or null. Cached for one request. */
export const currentProfile = cache(async () => {
  const id = await sessionProfileId();
  if (!id) return null;
  const [row] = await getDb().select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return row ?? null;
});
