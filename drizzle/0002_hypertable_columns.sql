CREATE TABLE "checkins" (
	"ts" timestamp with time zone NOT NULL,
	"profile_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"place_id" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"accuracy_m" real NOT NULL,
	"valid" boolean NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "noise_readings" (
	"ts" timestamp with time zone NOT NULL,
	"profile_id" uuid NOT NULL,
	"route_id" text NOT NULL,
	"from_stop_id" text NOT NULL,
	"to_stop_id" text NOT NULL,
	"db_avg" real NOT NULL,
	"db_peak" real NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ride_events" (
	"ts" timestamp with time zone NOT NULL,
	"profile_id" uuid NOT NULL,
	"plan_id" uuid,
	"trip_id" text,
	"route_id" text NOT NULL,
	"stop_id" text,
	"event" text NOT NULL,
	"is_replay" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	CONSTRAINT "ride_events_event" CHECK ("ride_events"."event" in ('board', 'pass', 'alight', 'on_train'))
);
--> statement-breakpoint
CREATE TABLE "vehicle_positions" (
	"ts" timestamp with time zone NOT NULL,
	"vehicle_id" text NOT NULL,
	"trip_id" text,
	"route_id" text NOT NULL,
	"direction_id" smallint,
	"stop_id" text,
	"current_status" text,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"bearing" real,
	"occupancy" jsonb
);
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noise_readings" ADD CONSTRAINT "noise_readings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_events" ADD CONSTRAINT "ride_events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_events" ADD CONSTRAINT "ride_events_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkins_plan_ts" ON "checkins" USING btree ("plan_id","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "checkins_profile_ts" ON "checkins" USING btree ("profile_id","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "noise_readings_profile_ts" ON "noise_readings" USING btree ("profile_id","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ride_events_profile_ts" ON "ride_events" USING btree ("profile_id","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ride_events_plan_ts" ON "ride_events" USING btree ("plan_id","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "vehicle_positions_trip_ts" ON "vehicle_positions" USING btree ("trip_id","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_positions_vehicle_ts" ON "vehicle_positions" USING btree ("vehicle_id","ts");