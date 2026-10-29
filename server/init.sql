-- SafeTransit PostgreSQL Initialization Script
-- Auto-executed when PostgreSQL container spins up

CREATE TABLE IF NOT EXISTS "users" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_users_gin" ON "users" USING GIN (data);

CREATE TABLE IF NOT EXISTS "crew" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_crew_gin" ON "crew" USING GIN (data);

CREATE TABLE IF NOT EXISTS "buses" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_buses_gin" ON "buses" USING GIN (data);

CREATE TABLE IF NOT EXISTS "routes" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_routes_gin" ON "routes" USING GIN (data);

CREATE TABLE IF NOT EXISTS "trips" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_trips_gin" ON "trips" USING GIN (data);

CREATE TABLE IF NOT EXISTS "duties" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_duties_gin" ON "duties" USING GIN (data);

CREATE TABLE IF NOT EXISTS "overtime" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_overtime_gin" ON "overtime" USING GIN (data);

CREATE TABLE IF NOT EXISTS "leaves" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_leaves_gin" ON "leaves" USING GIN (data);

CREATE TABLE IF NOT EXISTS "emergencies" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_emergencies_gin" ON "emergencies" USING GIN (data);

CREATE TABLE IF NOT EXISTS "collections" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_collections_gin" ON "collections" USING GIN (data);

CREATE TABLE IF NOT EXISTS "checklists" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_checklists_gin" ON "checklists" USING GIN (data);

CREATE TABLE IF NOT EXISTS "handovers" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_handovers_gin" ON "handovers" USING GIN (data);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_gin" ON "audit_logs" USING GIN (data);

CREATE TABLE IF NOT EXISTS "notifications" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_notifications_gin" ON "notifications" USING GIN (data);

CREATE TABLE IF NOT EXISTS "policies" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_policies_gin" ON "policies" USING GIN (data);

CREATE TABLE IF NOT EXISTS "duty_sessions" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_duty_sessions_gin" ON "duty_sessions" USING GIN (data);

CREATE TABLE IF NOT EXISTS "rest_periods" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_rest_periods_gin" ON "rest_periods" USING GIN (data);

CREATE TABLE IF NOT EXISTS "overtime_requests" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_overtime_requests_gin" ON "overtime_requests" USING GIN (data);

CREATE TABLE IF NOT EXISTS "driver_work_records" (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_driver_work_records_gin" ON "driver_work_records" USING GIN (data);
