-- DARKCITY CITIZEN LIFE TRACKING DATABASE
-- Comprehensive schema for tracking every aspect of citizen life

-- ====================
-- ACTIVITY LOG
-- ====================
CREATE TABLE IF NOT EXISTS activity_log (
  log_id BIGSERIAL PRIMARY KEY,
  citizen_id UUID NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Activity classification
  activity_type TEXT NOT NULL, -- 'job_claimed', 'property_rented', 'skill_learned', 'interaction', etc.
  category TEXT NOT NULL, -- 'economic', 'social', 'learning', 'movement', etc.
  
  -- Details
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- Impact tracking
  reputation_change INTEGER DEFAULT 0,
  currency_change INTEGER DEFAULT 0,
  
  -- Location context
  location_id UUID REFERENCES locations(location_id),
  district_id UUID REFERENCES districts(district_id),
  
  -- Indices
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_citizen ON activity_log(citizen_id, timestamp DESC);
CREATE INDEX idx_activity_type ON activity_log(activity_type);
CREATE INDEX idx_activity_timestamp ON activity_log(timestamp DESC);

-- ====================
-- CITIZEN STATS
-- ====================
CREATE TABLE IF NOT EXISTS citizen_stats (
  citizen_id UUID PRIMARY KEY REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  
  -- Lifetime totals
  total_jobs_completed INTEGER DEFAULT 0,
  total_jobs_failed INTEGER DEFAULT 0,
  total_reputation_earned INTEGER DEFAULT 0,
  total_reputation_lost INTEGER DEFAULT 0,
  total_currency_earned INTEGER DEFAULT 0,
  total_currency_spent INTEGER DEFAULT 0,
  
  -- Social stats
  total_interactions INTEGER DEFAULT 0,
  total_friends INTEGER DEFAULT 0,
  total_enemies INTEGER DEFAULT 0,
  
  -- Activity stats
  total_locations_visited INTEGER DEFAULT 0,
  total_skills_learned INTEGER DEFAULT 0,
  total_achievements_unlocked INTEGER DEFAULT 0,
  
  -- Time tracking
  total_hours_active DECIMAL(10,2) DEFAULT 0,
  days_since_registration INTEGER DEFAULT 0,
  longest_active_streak INTEGER DEFAULT 0,
  current_active_streak INTEGER DEFAULT 0,
  
  -- Progression
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  next_level_xp INTEGER DEFAULT 100,
  
  -- Last updated
  last_stat_update TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================
-- ACHIEVEMENTS
-- ====================
CREATE TABLE IF NOT EXISTS achievements (
  achievement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Achievement info
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'social', 'economic', 'exploration', 'mastery', etc.
  tier TEXT NOT NULL DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  
  -- Unlock criteria
  unlock_criteria JSONB NOT NULL, -- conditions for earning this
  
  -- Rewards
  reputation_reward INTEGER DEFAULT 0,
  currency_reward INTEGER DEFAULT 0,
  title_reward TEXT,
  
  -- Metadata
  icon TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  is_repeatable BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS citizen_achievements (
  citizen_id UUID NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(achievement_id) ON DELETE CASCADE,
  
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  times_earned INTEGER DEFAULT 1,
  
  PRIMARY KEY (citizen_id, achievement_id)
);

CREATE INDEX idx_citizen_achievements ON citizen_achievements(citizen_id);

-- ====================
-- RELATIONSHIPS
-- ====================
CREATE TABLE IF NOT EXISTS relationships (
  relationship_id BIGSERIAL PRIMARY KEY,
  
  -- Participants
  citizen_id UUID NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  target_citizen_id UUID NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  
  -- Relationship type
  relationship_type TEXT NOT NULL, -- 'friend', 'rival', 'mentor', 'business_partner', etc.
  
  -- Strength tracking
  affinity_score INTEGER DEFAULT 0 CHECK (affinity_score >= -100 AND affinity_score <= 100),
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'blocked'
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent self-relationships
  CHECK (citizen_id != target_citizen_id),
  
  -- Ensure unique pairs (bidirectional)
  UNIQUE (citizen_id, target_citizen_id)
);

CREATE INDEX idx_relationships_citizen ON relationships(citizen_id);
CREATE INDEX idx_relationships_target ON relationships(target_citizen_id);
CREATE INDEX idx_relationships_type ON relationships(relationship_type);

-- ====================
-- PROPERTY HISTORY
-- ====================
CREATE TABLE IF NOT EXISTS property_history (
  history_id BIGSERIAL PRIMARY KEY,
  
  -- Property and owner
  unit_id UUID REFERENCES housing_units(unit_id),
  citizen_id UUID NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  
  -- Transaction details
  event_type TEXT NOT NULL, -- 'lease_start', 'lease_end', 'eviction', 'transfer'
  lease_id UUID REFERENCES leases(lease_id),
  
  -- Financial
  monthly_rent INTEGER,
  total_paid INTEGER DEFAULT 0,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Context
  reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_history_citizen ON property_history(citizen_id);
CREATE INDEX idx_property_history_unit ON property_history(unit_id);

-- ====================
-- TRANSACTIONS
-- ====================
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id BIGSERIAL PRIMARY KEY,
  
  -- Parties involved
  from_citizen_id UUID REFERENCES citizens(citizen_id) ON DELETE SET NULL,
  to_citizen_id UUID REFERENCES citizens(citizen_id) ON DELETE SET NULL,
  
  -- Transaction details
  transaction_type TEXT NOT NULL, -- 'job_payment', 'rent', 'purchase', 'transfer', 'tax', etc.
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'CITY', -- 'CITY', 'SOL', 'DARKFLOBI'
  
  -- Context
  description TEXT NOT NULL,
  reference_id TEXT, -- job_id, lease_id, etc.
  reference_type TEXT, -- 'job', 'lease', 'purchase', etc.
  
  -- Status
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'reversed'
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_from ON transactions(from_citizen_id, timestamp DESC);
CREATE INDEX idx_transactions_to ON transactions(to_citizen_id, timestamp DESC);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- ====================
-- SKILL PROGRESSION
-- ====================
CREATE TABLE IF NOT EXISTS skill_progression (
  progression_id BIGSERIAL PRIMARY KEY,
  
  citizen_id UUID NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  
  -- Level tracking
  level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 100),
  experience INTEGER DEFAULT 0,
  experience_required INTEGER DEFAULT 100,
  
  -- Usage stats
  times_used INTEGER DEFAULT 0,
  times_succeeded INTEGER DEFAULT 0,
  times_failed INTEGER DEFAULT 0,
  
  -- Dates
  first_learned TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ DEFAULT NOW(),
  
  -- Milestones
  milestones JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (citizen_id, skill_name)
);

CREATE INDEX idx_skill_progression_citizen ON skill_progression(citizen_id);
CREATE INDEX idx_skill_progression_skill ON skill_progression(skill_name);

-- ====================
-- REPUTATION EVENTS
-- ====================
CREATE TABLE IF NOT EXISTS reputation_events (
  event_id BIGSERIAL PRIMARY KEY,
  
  citizen_id UUID NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL, -- 'job_completed', 'bounty_claimed', 'contribution_validated', etc.
  event_source TEXT NOT NULL, -- what triggered this
  
  -- Reputation change
  reputation_change INTEGER NOT NULL,
  reputation_before INTEGER NOT NULL,
  reputation_after INTEGER NOT NULL,
  
  -- Context
  description TEXT NOT NULL,
  reference_id TEXT,
  
  -- Location
  location_id UUID REFERENCES locations(location_id),
  district_id UUID REFERENCES districts(district_id),
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_events_citizen ON reputation_events(citizen_id, timestamp DESC);
CREATE INDEX idx_reputation_events_type ON reputation_events(event_type);

-- ====================
-- INVENTORY
-- ====================
CREATE TABLE IF NOT EXISTS inventory (
  inventory_id BIGSERIAL PRIMARY KEY,
  
  citizen_id UUID NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  
  -- Item details
  item_type TEXT NOT NULL, -- 'tool', 'consumable', 'cosmetic', 'document', etc.
  item_name TEXT NOT NULL,
  item_description TEXT,
  
  -- Quantity and status
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
  is_equipped BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  rarity TEXT DEFAULT 'common', -- 'common', 'uncommon', 'rare', 'legendary'
  properties JSONB DEFAULT '{}',
  
  -- Dates
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_citizen ON inventory(citizen_id);
CREATE INDEX idx_inventory_type ON inventory(item_type);

-- ====================
-- DAILY SNAPSHOTS
-- ====================
CREATE TABLE IF NOT EXISTS daily_snapshots (
  snapshot_id BIGSERIAL PRIMARY KEY,
  
  citizen_id UUID NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  
  -- Stats at end of day
  reputation INTEGER NOT NULL,
  currency_balance INTEGER NOT NULL,
  level INTEGER NOT NULL,
  
  -- Activity summary
  jobs_completed_today INTEGER DEFAULT 0,
  reputation_gained_today INTEGER DEFAULT 0,
  currency_earned_today INTEGER DEFAULT 0,
  interactions_today INTEGER DEFAULT 0,
  
  -- Context
  primary_location TEXT,
  active_jobs INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (citizen_id, snapshot_date)
);

CREATE INDEX idx_daily_snapshots_citizen ON daily_snapshots(citizen_id, snapshot_date DESC);

-- ====================
-- FUNCTIONS
-- ====================

-- Function to update citizen stats
CREATE OR REPLACE FUNCTION update_citizen_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE citizen_stats
  SET 
    updated_at = NOW(),
    last_stat_update = NOW()
  WHERE citizen_id = NEW.citizen_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_citizen_activity(
  p_citizen_id UUID,
  p_activity_type TEXT,
  p_category TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_reputation_change INTEGER DEFAULT 0,
  p_currency_change INTEGER DEFAULT 0
) RETURNS BIGINT AS $$
DECLARE
  v_log_id BIGINT;
BEGIN
  INSERT INTO activity_log (
    citizen_id,
    activity_type,
    category,
    description,
    metadata,
    reputation_change,
    currency_change
  ) VALUES (
    p_citizen_id,
    p_activity_type,
    p_category,
    p_description,
    p_metadata,
    p_reputation_change,
    p_currency_change
  ) RETURNING log_id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- TRIGGERS
-- ====================

-- Trigger to update stats on activity
CREATE TRIGGER trg_activity_updates_stats
AFTER INSERT ON activity_log
FOR EACH ROW
EXECUTE FUNCTION update_citizen_stats();

-- ====================
-- SEED DATA
-- ====================

-- Insert initial achievements
INSERT INTO achievements (name, description, category, tier, unlock_criteria, reputation_reward) VALUES
('First Steps', 'Register as a citizen of DARKCITY', 'milestone', 'bronze', '{"type": "register"}', 10),
('First Job', 'Complete your first job', 'economic', 'bronze', '{"type": "jobs_completed", "count": 1}', 25),
('Entrepreneur', 'Complete 10 jobs', 'economic', 'silver', '{"type": "jobs_completed", "count": 10}', 100),
('Master Trader', 'Complete 100 jobs', 'economic', 'gold', '{"type": "jobs_completed", "count": 100}', 500),
('Socialite', 'Form 5 relationships', 'social', 'silver', '{"type": "relationships", "count": 5}', 50),
('Property Owner', 'Rent your first property', 'economic', 'bronze', '{"type": "property_rented", "count": 1}', 50),
('Reputation Builder', 'Reach 100 reputation', 'milestone', 'silver', '{"type": "reputation", "value": 100}', 100),
('Respected Citizen', 'Reach 500 reputation', 'milestone', 'gold', '{"type": "reputation", "value": 500}', 250),
('Living Legend', 'Reach 1000 reputation', 'milestone', 'platinum', '{"type": "reputation", "value": 1000}', 1000)
ON CONFLICT (name) DO NOTHING;

-- Initialize stats for existing citizens
INSERT INTO citizen_stats (citizen_id)
SELECT citizen_id FROM citizens
ON CONFLICT (citizen_id) DO NOTHING;

COMMENT ON TABLE activity_log IS 'Every action a citizen takes in DARKCITY';
COMMENT ON TABLE citizen_stats IS 'Lifetime statistics for each citizen';
COMMENT ON TABLE achievements IS 'Unlockable milestones and rewards';
COMMENT ON TABLE relationships IS 'Social connections between citizens';
COMMENT ON TABLE property_history IS 'Complete history of property ownership';
COMMENT ON TABLE transactions IS 'All financial transactions';
COMMENT ON TABLE skill_progression IS 'Skill leveling and experience';
COMMENT ON TABLE reputation_events IS 'Detailed reputation change history';
COMMENT ON TABLE inventory IS 'Items owned by citizens';
COMMENT ON TABLE daily_snapshots IS 'Daily progress snapshots for analytics';
