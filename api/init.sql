-- DARKCITY Database Schema
-- PostgreSQL initialization script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AGENTS
-- ============================================================================

CREATE TABLE agents (
  id VARCHAR(64) PRIMARY KEY,
  wallet_address VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Stats
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_battles INTEGER DEFAULT 0,
  elo_rating INTEGER DEFAULT 1200,
  
  -- Constraints
  CONSTRAINT valid_name CHECK (name ~ '^[a-zA-Z0-9_-]+$')
);

CREATE INDEX idx_agents_wallet ON agents(wallet_address);
CREATE INDEX idx_agents_elo ON agents(elo_rating DESC);

-- ============================================================================
-- CHARACTERS
-- ============================================================================

CREATE TABLE characters (
  id VARCHAR(64) PRIMARY KEY,
  agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name VARCHAR(32) NOT NULL,
  class VARCHAR(16) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Base stats (JSONB for flexibility)
  stats JSONB NOT NULL,
  
  -- Inventory
  inventory JSONB DEFAULT '[]'::jsonb,
  
  -- Constraints
  CONSTRAINT valid_class CHECK (class IN ('warrior', 'mage', 'rogue', 'tank', 'assassin', 'healer'))
);

CREATE INDEX idx_characters_agent ON characters(agent_id);
CREATE INDEX idx_characters_class ON characters(class);

-- ============================================================================
-- BATTLES
-- ============================================================================

CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(16) NOT NULL DEFAULT 'waiting',
  turn INTEGER DEFAULT 0,
  current_player VARCHAR(64),
  
  -- Grid state (10x10 grid with obstacles, etc.)
  grid JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Winner
  winner_id VARCHAR(64),
  
  -- Battle config
  config JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('waiting', 'active', 'completed', 'cancelled'))
);

CREATE INDEX idx_battles_status ON battles(status);
CREATE INDEX idx_battles_created ON battles(created_at DESC);

-- ============================================================================
-- BATTLE PARTICIPANTS
-- ============================================================================

CREATE TABLE battle_participants (
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  character_id VARCHAR(64) NOT NULL REFERENCES characters(id),
  agent_id VARCHAR(64) NOT NULL REFERENCES agents(id),
  
  -- Current state in battle
  current_hp INTEGER NOT NULL,
  position JSONB NOT NULL,
  status_effects JSONB DEFAULT '[]'::jsonb,
  
  -- Participation info
  joined_at TIMESTAMP DEFAULT NOW(),
  placement INTEGER, -- 1 = winner, 2 = second, etc.
  
  PRIMARY KEY (battle_id, character_id)
);

CREATE INDEX idx_participants_battle ON battle_participants(battle_id);
CREATE INDEX idx_participants_character ON battle_participants(character_id);
CREATE INDEX idx_participants_agent ON battle_participants(agent_id);

-- ============================================================================
-- BATTLE ACTIONS
-- ============================================================================

CREATE TABLE battle_actions (
  id SERIAL PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  turn INTEGER NOT NULL,
  
  -- Actor
  actor_id VARCHAR(64) NOT NULL,
  actor_character_id VARCHAR(64) NOT NULL,
  
  -- Action details
  action_type VARCHAR(16) NOT NULL,
  target_id VARCHAR(64),
  target_position JSONB,
  item_id VARCHAR(64),
  
  -- Result
  result JSONB NOT NULL,
  success BOOLEAN NOT NULL,
  damage_dealt INTEGER DEFAULT 0,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_action_type CHECK (action_type IN ('attack', 'defend', 'special', 'move', 'item'))
);

CREATE INDEX idx_actions_battle ON battle_actions(battle_id, turn);
CREATE INDEX idx_actions_actor ON battle_actions(actor_id);

-- ============================================================================
-- MATCHMAKING QUEUE
-- ============================================================================

CREATE TABLE matchmaking_queue (
  agent_id VARCHAR(64) PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  character_id VARCHAR(64) NOT NULL REFERENCES characters(id),
  elo_rating INTEGER NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  preferences JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_queue_elo ON matchmaking_queue(elo_rating);
CREATE INDEX idx_queue_joined ON matchmaking_queue(joined_at);

-- ============================================================================
-- ITEMS (for future inventory system)
-- ============================================================================

CREATE TABLE items (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  rarity VARCHAR(16) NOT NULL,
  
  -- Effects
  effects JSONB NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_rarity CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'))
);

-- ============================================================================
-- TOURNAMENTS
-- ============================================================================

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(128) NOT NULL,
  format VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'registration',
  
  -- Scheduling
  registration_opens TIMESTAMP NOT NULL,
  registration_closes TIMESTAMP NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP,
  
  -- Configuration
  max_participants INTEGER NOT NULL,
  entry_fee INTEGER DEFAULT 0,
  prize_pool INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('registration', 'active', 'completed', 'cancelled')),
  CONSTRAINT valid_format CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin'))
);

CREATE TABLE tournament_participants (
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  agent_id VARCHAR(64) NOT NULL REFERENCES agents(id),
  character_id VARCHAR(64) NOT NULL REFERENCES characters(id),
  registered_at TIMESTAMP DEFAULT NOW(),
  placement INTEGER,
  
  PRIMARY KEY (tournament_id, agent_id)
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Update agent stats after battle
CREATE OR REPLACE FUNCTION update_agent_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.winner_id IS NOT NULL THEN
    -- Update winner
    UPDATE agents
    SET wins = wins + 1,
        total_battles = total_battles + 1,
        elo_rating = elo_rating + 25
    WHERE id = (
      SELECT agent_id FROM battle_participants
      WHERE battle_id = NEW.id AND character_id IN (
        SELECT character_id FROM battle_participants
        WHERE battle_id = NEW.id AND placement = 1
      )
      LIMIT 1
    );
    
    -- Update losers
    UPDATE agents
    SET losses = losses + 1,
        total_battles = total_battles + 1,
        elo_rating = GREATEST(elo_rating - 15, 0)
    WHERE id IN (
      SELECT agent_id FROM battle_participants
      WHERE battle_id = NEW.id AND placement > 1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER battle_completed
AFTER UPDATE ON battles
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION update_agent_stats();

-- ============================================================================
-- SAMPLE DATA (for development)
-- ============================================================================

-- Create test agent
INSERT INTO agents (id, wallet_address, name, metadata)
VALUES (
  'agent_test',
  'TestWalletAddress1234567890',
  'test_agent',
  '{"description": "Test agent for development"}'::jsonb
);

-- Create test character
INSERT INTO characters (id, agent_id, name, class, stats)
VALUES (
  'char_test_warrior',
  'agent_test',
  'test_warrior',
  'warrior',
  '{"hp": 150, "maxHp": 150, "attack": 25, "defense": 20, "speed": 10}'::jsonb
);

-- Create test battle
INSERT INTO battles (id, status)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'active'
);

-- Add test participant
INSERT INTO battle_participants (battle_id, character_id, agent_id, current_hp, position)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'char_test_warrior',
  'agent_test',
  150,
  '{"x": 0, "y": 0}'::jsonb
);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Leaderboard view
CREATE VIEW leaderboard AS
SELECT 
  a.id,
  a.name,
  a.wins,
  a.losses,
  a.total_battles,
  a.elo_rating,
  ROUND(a.wins::numeric / NULLIF(a.total_battles, 0), 3) as win_rate
FROM agents a
WHERE a.total_battles > 0
ORDER BY a.elo_rating DESC, a.wins DESC;

-- Active battles view
CREATE VIEW active_battles AS
SELECT 
  b.id,
  b.status,
  b.turn,
  b.created_at,
  json_agg(
    json_build_object(
      'agent_id', bp.agent_id,
      'character_id', bp.character_id,
      'hp', bp.current_hp
    )
  ) as participants
FROM battles b
JOIN battle_participants bp ON b.id = bp.battle_id
WHERE b.status = 'active'
GROUP BY b.id;

-- ============================================================================
-- GRANTS (for API user)
-- ============================================================================

-- Create API user (if running with separate user)
-- CREATE USER darkcity_api WITH PASSWORD 'secure_password_here';
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO darkcity_api;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO darkcity_api;

COMMIT;
