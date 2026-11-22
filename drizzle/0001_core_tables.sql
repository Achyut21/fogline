CREATE TABLE "ai_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"output" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges_awarded" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "badges_awarded_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"profile_id" uuid NOT NULL,
	"badge_id" text NOT NULL,
	"plan_id" uuid,
	"scope" text,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "badges_awarded_once" UNIQUE NULLS NOT DISTINCT("profile_id","badge_id","plan_id","scope")
);
--> statement-breakpoint
CREATE TABLE "daily_puzzles" (
	"date" date PRIMARY KEY NOT NULL,
	"word" text NOT NULL,
	"event_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"profile_id" uuid,
	"placeholder_name" text,
	"origin_station_id" text,
	"rsvp" text DEFAULT 'pending' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_participants_plan_profile" UNIQUE("plan_id","profile_id"),
	CONSTRAINT "plan_participants_rsvp" CHECK ("plan_participants"."rsvp" in ('pending', 'yes', 'no')),
	CONSTRAINT "plan_participants_seat" CHECK (("plan_participants"."profile_id" is not null and "plan_participants"."placeholder_name" is null and "plan_participants"."origin_station_id" is null)
        or ("plan_participants"."profile_id" is null and ("plan_participants"."placeholder_name" is null) = ("plan_participants"."origin_station_id" is null)))
);
--> statement-breakpoint
CREATE TABLE "plan_stops" (
	"plan_id" uuid NOT NULL,
	"seq" smallint NOT NULL,
	"place_id" text NOT NULL,
	"station_id" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	CONSTRAINT "plan_stops_plan_id_seq_pk" PRIMARY KEY("plan_id","seq")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"status" text DEFAULT 'draft' NOT NULL,
	"budget" smallint,
	"vibe" text,
	"calm" boolean DEFAULT false NOT NULL,
	"min_grade" text,
	"invite_token" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_invite_token_unique" UNIQUE("invite_token"),
	CONSTRAINT "plans_kind" CHECK ("plans"."kind" in ('meetup', 'crawl')),
	CONSTRAINT "plans_status" CHECK ("plans"."status" in ('draft', 'planned', 'live', 'ended')),
	CONSTRAINT "plans_vibe" CHECK ("plans"."vibe" in ('quiet', 'lively')),
	CONSTRAINT "plans_min_grade" CHECK ("plans"."min_grade" in ('A', 'B')),
	CONSTRAINT "plans_budget" CHECK ("plans"."budget" between 1 and 3),
	CONSTRAINT "plans_ended" CHECK (("plans"."status" = 'ended') = ("plans"."ended_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"school" text NOT NULL,
	"home_station_id" text NOT NULL,
	"age_band" text NOT NULL,
	"profile_code" text NOT NULL,
	"theme_pref" text DEFAULT 'system' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_profile_code_unique" UNIQUE("profile_code"),
	CONSTRAINT "profiles_age_band" CHECK ("profiles"."age_band" in ('under21', '21plus')),
	CONSTRAINT "profiles_theme_pref" CHECK ("profiles"."theme_pref" in ('system', 'light', 'dark'))
);
--> statement-breakpoint
CREATE TABLE "puzzle_results" (
	"profile_id" uuid NOT NULL,
	"date" date NOT NULL,
	"guesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"solved" boolean DEFAULT false NOT NULL,
	"solved_at" timestamp with time zone,
	CONSTRAINT "puzzle_results_profile_id_date_pk" PRIMARY KEY("profile_id","date"),
	CONSTRAINT "puzzle_results_solved" CHECK ("puzzle_results"."solved" = ("puzzle_results"."solved_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "revealed_cells" (
	"profile_id" uuid NOT NULL,
	"h3" text NOT NULL,
	"state" text NOT NULL,
	"source" text NOT NULL,
	"first_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revealed_cells_profile_id_h3_pk" PRIMARY KEY("profile_id","h3"),
	CONSTRAINT "revealed_cells_state" CHECK ("revealed_cells"."state" in ('seen', 'visited')),
	CONSTRAINT "revealed_cells_source" CHECK ("revealed_cells"."source" in ('home', 'ride', 'checkin', 'puzzle'))
);
--> statement-breakpoint
ALTER TABLE "badges_awarded" ADD CONSTRAINT "badges_awarded_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badges_awarded" ADD CONSTRAINT "badges_awarded_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_participants" ADD CONSTRAINT "plan_participants_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_participants" ADD CONSTRAINT "plan_participants_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_stops" ADD CONSTRAINT "plan_stops_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_results" ADD CONSTRAINT "puzzle_results_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revealed_cells" ADD CONSTRAINT "revealed_cells_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "badges_awarded_plan" ON "badges_awarded" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_participants_profile" ON "plan_participants" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "plans_created_by" ON "plans" USING btree ("created_by");