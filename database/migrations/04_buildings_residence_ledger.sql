-- DARKCITY Migration 04
-- Adds persistent buildings + agent residence fields + immutable ledger for production PostgreSQL

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- BUILDINGS (persistent lifecycle state)
-- ============================================================================
CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
    owner_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
    type VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
    required_progress INTEGER NOT NULL DEFAULT 100 CHECK (required_progress > 0),
    is_residential BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_buildings_district_id ON buildings(district_id);
CREATE INDEX IF NOT EXISTS idx_buildings_owner_agent_id ON buildings(owner_agent_id);
CREATE INDEX IF NOT EXISTS idx_buildings_status_created_at ON buildings(status, created_at DESC);

-- ============================================================================
-- AGENT RESIDENCE FIELDS
-- ============================================================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS home_district_id UUID;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS building_id UUID;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS unit TEXT;

-- Backfill home_district_id from current_location_id -> locations.zone_id -> zones.district_id.
UPDATE agents a
SET home_district_id = z.district_id
FROM locations l
JOIN zones z ON z.id = l.zone_id
WHERE a.current_location_id = l.id
  AND a.home_district_id IS NULL;

-- Final fallback for any rows still missing a district: first available district.
UPDATE agents
SET home_district_id = (
    SELECT id FROM districts ORDER BY name ASC LIMIT 1
)
WHERE home_district_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agents_home_district') THEN
        ALTER TABLE agents
            ADD CONSTRAINT fk_agents_home_district
            FOREIGN KEY (home_district_id) REFERENCES districts(id) ON DELETE RESTRICT;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agents_building') THEN
        ALTER TABLE agents
            ADD CONSTRAINT fk_agents_building
            FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL;
    END IF;
END$$;

ALTER TABLE agents
    ALTER COLUMN home_district_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agents_home_district_id ON agents(home_district_id);
CREATE INDEX IF NOT EXISTS idx_agents_building_id ON agents(building_id);

-- ============================================================================
-- IMMUTABLE LEDGER (append-only canonical record)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_type VARCHAR(16) NOT NULL CHECK (actor_type IN ('agent', 'system')),
    actor_id UUID,
    event_type VARCHAR(64) NOT NULL,
    district_id UUID REFERENCES districts(id) ON DELETE SET NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_ts ON ledger_entries(ts DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_actor_id_ts ON ledger_entries(actor_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_event_type_ts ON ledger_entries(event_type, ts DESC);

-- Prevent updates/deletes to keep ledger append-only.
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'ledger_entries is append-only; % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_update ON ledger_entries;
DROP TRIGGER IF EXISTS trg_prevent_ledger_delete ON ledger_entries;

CREATE TRIGGER trg_prevent_ledger_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_mutation();

CREATE TRIGGER trg_prevent_ledger_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_mutation();

COMMIT;
