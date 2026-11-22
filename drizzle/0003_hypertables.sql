-- Hypertables, continuous aggregates and policies (ARCHITECTURE section 6, D-053). Drizzle runs
-- every pending migration in one transaction, so continuous aggregates start WITH NO DATA and
-- fill from their refresh policies. Real-time reads only add raw rows newer than the last
-- refresh, so the windows span days: a stall shorter than the window leaves no hole.
SELECT create_hypertable('vehicle_positions', by_range('ts', INTERVAL '1 day'));--> statement-breakpoint
SELECT create_hypertable('checkins', by_range('ts', INTERVAL '7 days'));--> statement-breakpoint
SELECT create_hypertable('ride_events', by_range('ts', INTERVAL '7 days'));--> statement-breakpoint
SELECT create_hypertable('noise_readings', by_range('ts', INTERVAL '7 days'));--> statement-breakpoint

ALTER TABLE vehicle_positions SET (
  timescaledb.enable_columnstore,
  timescaledb.segmentby = 'route_id',
  timescaledb.orderby = 'ts DESC'
);--> statement-breakpoint
ALTER TABLE checkins SET (
  timescaledb.enable_columnstore,
  timescaledb.segmentby = '',
  timescaledb.orderby = 'ts DESC'
);--> statement-breakpoint
ALTER TABLE ride_events SET (
  timescaledb.enable_columnstore,
  timescaledb.segmentby = 'profile_id',
  timescaledb.orderby = 'ts DESC'
);--> statement-breakpoint
ALTER TABLE noise_readings SET (
  timescaledb.enable_columnstore,
  timescaledb.segmentby = 'route_id',
  timescaledb.orderby = 'ts DESC'
);--> statement-breakpoint

CALL add_columnstore_policy('vehicle_positions', after => INTERVAL '1 day');--> statement-breakpoint
CALL add_columnstore_policy('checkins', after => INTERVAL '7 days');--> statement-breakpoint
CALL add_columnstore_policy('ride_events', after => INTERVAL '7 days');--> statement-breakpoint
CALL add_columnstore_policy('noise_readings', after => INTERVAL '7 days');--> statement-breakpoint
SELECT add_retention_policy('vehicle_positions', drop_after => INTERVAL '30 days');--> statement-breakpoint

CREATE MATERIALIZED VIEW vehicle_activity_5m
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT time_bucket(INTERVAL '5 minutes', ts) AS bucket,
       route_id,
       count(DISTINCT vehicle_id) AS vehicles,
       count(*) AS samples
FROM vehicle_positions
GROUP BY bucket, route_id
WITH NO DATA;--> statement-breakpoint

CREATE MATERIALIZED VIEW checkins_daily
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT time_bucket(INTERVAL '1 day', ts, 'America/New_York') AS day,
       count(*) AS checkins,
       count(*) FILTER (WHERE valid) AS valid_checkins
FROM checkins
WHERE NOT is_demo
GROUP BY day
WITH NO DATA;--> statement-breakpoint

CREATE MATERIALIZED VIEW segment_noise_hourly
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT time_bucket(INTERVAL '1 hour', ts) AS hour,
       route_id,
       from_stop_id,
       to_stop_id,
       avg(db_avg) AS db_avg,
       max(db_peak) AS db_peak,
       count(*) AS readings
FROM noise_readings
WHERE NOT is_demo
GROUP BY hour, route_id, from_stop_id, to_stop_id
WITH NO DATA;--> statement-breakpoint

SELECT add_continuous_aggregate_policy('vehicle_activity_5m',
  start_offset => INTERVAL '2 days',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes');--> statement-breakpoint
SELECT add_continuous_aggregate_policy('checkins_daily',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');--> statement-breakpoint
SELECT add_continuous_aggregate_policy('segment_noise_hourly',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');
