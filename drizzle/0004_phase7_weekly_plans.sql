CREATE TABLE "weekly_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_of" date NOT NULL,
	"seq" smallint NOT NULL,
	"template" text NOT NULL,
	"event_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"stops" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_plans_week_seq" UNIQUE("week_of","seq")
);
--> statement-breakpoint
ALTER TABLE "plan_stops" ADD COLUMN "walked_from_previous" boolean DEFAULT false NOT NULL;