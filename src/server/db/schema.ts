import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const ageBands = ["under21", "21plus"] as const;
export const themePrefs = ["system", "light", "dark"] as const;
export const planKinds = ["meetup", "crawl"] as const;
export const planStatuses = ["draft", "planned", "live", "ended"] as const;
export const vibes = ["quiet", "lively"] as const;
export const minGrades = ["A", "B"] as const;
export const rsvps = ["pending", "yes", "no"] as const;
export const cellStates = ["seen", "visited"] as const;
export const cellSources = ["home", "ride", "checkin", "puzzle"] as const;

/** One list feeds both the column's type and its check constraint. */
function oneOf(name: string, column: AnyPgColumn, values: readonly string[]) {
  const list = values.map((value) => `'${value}'`).join(", ");
  return check(name, sql`${column} in (${sql.raw(list)})`);
}

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const isDemo = () => boolean("is_demo").notNull().default(false);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    displayName: text("display_name").notNull(),
    school: text("school").notNull(),
    homeStationId: text("home_station_id").notNull(),
    ageBand: text("age_band", { enum: ageBands }).notNull(),
    profileCode: text("profile_code").notNull().unique(),
    themePref: text("theme_pref", { enum: themePrefs }).notNull().default("system"),
    isDemo: isDemo(),
    createdAt: createdAt(),
  },
  (t) => [
    oneOf("profiles_age_band", t.ageBand, ageBands),
    oneOf("profiles_theme_pref", t.themePref, themePrefs),
  ],
);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    kind: text("kind", { enum: planKinds }).notNull(),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    status: text("status", { enum: planStatuses }).notNull().default("draft"),
    budget: smallint("budget"),
    vibe: text("vibe", { enum: vibes }),
    calm: boolean("calm").notNull().default(false),
    minGrade: text("min_grade", { enum: minGrades }),
    inviteToken: text("invite_token").notNull().unique(),
    isDemo: isDemo(),
    createdAt: createdAt(),
  },
  (t) => [
    oneOf("plans_kind", t.kind, planKinds),
    oneOf("plans_status", t.status, planStatuses),
    oneOf("plans_vibe", t.vibe, vibes),
    oneOf("plans_min_grade", t.minGrade, minGrades),
    check("plans_budget", sql`${t.budget} between 1 and 3`),
    check("plans_ended", sql`(${t.status} = 'ended') = (${t.endedAt} is not null)`),
    index("plans_created_by").on(t.createdBy),
  ],
);

/**
 * A seat is a joined profile (its station comes from the profile), a placeholder with a name and
 * a station, or a former member with neither (F1.7, D-019).
 */
export const planParticipants = pgTable(
  "plan_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    placeholderName: text("placeholder_name"),
    originStationId: text("origin_station_id"),
    rsvp: text("rsvp", { enum: rsvps }).notNull().default("pending"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("plan_participants_plan_profile").on(t.planId, t.profileId),
    oneOf("plan_participants_rsvp", t.rsvp, rsvps),
    check(
      "plan_participants_seat",
      sql`(${t.profileId} is not null and ${t.placeholderName} is null and ${t.originStationId} is null)
        or (${t.profileId} is null and (${t.placeholderName} is null) = (${t.originStationId} is null))`,
    ),
    index("plan_participants_profile").on(t.profileId),
  ],
);

export const planStops = pgTable(
  "plan_stops",
  {
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    seq: smallint("seq").notNull(),
    placeId: text("place_id").notNull(),
    stationId: text("station_id").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.seq] })],
);

export const revealedCells = pgTable(
  "revealed_cells",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    h3: text("h3").notNull(),
    state: text("state", { enum: cellStates }).notNull(),
    source: text("source", { enum: cellSources }).notNull(),
    firstAt: timestamp("first_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.h3] }),
    oneOf("revealed_cells_state", t.state, cellStates),
    oneOf("revealed_cells_source", t.source, cellSources),
  ],
);

// NULLS NOT DISTINCT keeps explorer badges, whose plan_id is null, from duplicating (D-022).
export const badgesAwarded = pgTable(
  "badges_awarded",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull(),
    planId: uuid("plan_id").references(() => plans.id, { onDelete: "cascade" }),
    scope: text("scope"),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
    meta: jsonb("meta").notNull().default({}),
  },
  (t) => [
    unique("badges_awarded_once").on(t.profileId, t.badgeId, t.planId, t.scope).nullsNotDistinct(),
    index("badges_awarded_plan").on(t.planId),
  ],
);

export const dailyPuzzles = pgTable("daily_puzzles", {
  date: date("date").primaryKey(),
  word: text("word").notNull(),
  eventId: text("event_id").notNull(),
});

export const puzzleResults = pgTable(
  "puzzle_results",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    guesses: jsonb("guesses").$type<string[]>().notNull().default([]),
    solved: boolean("solved").notNull().default(false),
    solvedAt: timestamp("solved_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.date] }),
    check("puzzle_results_solved", sql`${t.solved} = (${t.solvedAt} is not null)`),
  ],
);

export const aiCache = pgTable("ai_cache", {
  key: text("key").primaryKey(),
  model: text("model").notNull(),
  output: jsonb("output").notNull(),
  createdAt: createdAt(),
});
