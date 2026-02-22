-- DARKCITY Interaction Layer Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Interactions table
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'CONVERSATION', 'TRANSACTION', 'SERVICE', 
    'CHALLENGE', 'COLLABORATION', 'GREETING', 'GOSSIP'
  )),
  status VARCHAR(50) NOT NULL CHECK (status IN (
    'PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 
    'ABANDONED', 'REJECTED', 'CANCELLED'
  )),
  initiator VARCHAR(255) NOT NULL,
  targets TEXT[] NOT NULL,
  location VARCHAR(255) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
  thread_id UUID NOT NULL,
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  outcomes JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interactions_initiator ON interactions(initiator);
CREATE INDEX idx_interactions_status ON interactions(status);
CREATE INDEX idx_interactions_location ON interactions(location);
CREATE INDEX idx_interactions_started_at ON interactions(started_at DESC);
CREATE INDEX idx_interactions_thread_id ON interactions(thread_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL,
  from_agent VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  content JSONB NOT NULL,
  offer JSONB,
  response JSONB,
  generation_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_interaction_id ON messages(interaction_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_from_agent ON messages(from_agent);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interaction_id UUID REFERENCES interactions(id),
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'PURCHASE', 'SALE', 'SERVICE', 'TRADE'
  )),
  buyer VARCHAR(255) NOT NULL,
  seller VARCHAR(255) NOT NULL,
  items JSONB NOT NULL,
  price JSONB NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN (
    'NEGOTIATING', 'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'
  )),
  negotiation_history JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  transaction_hash VARCHAR(255)
);

CREATE INDEX idx_transactions_buyer ON transactions(buyer);
CREATE INDEX idx_transactions_seller ON transactions(seller);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Agent balances table
CREATE TABLE IF NOT EXISTS agent_balances (
  agent_id VARCHAR(255) PRIMARY KEY,
  balance DECIMAL(20, 2) DEFAULT 0 CHECK (balance >= 0),
  currency VARCHAR(20) DEFAULT 'DARKCOIN',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_balances_balance ON agent_balances(balance DESC);

-- Agent inventory table
CREATE TABLE IF NOT EXISTS agent_inventory (
  agent_id VARCHAR(255) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  acquired_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  PRIMARY KEY (agent_id, item_id)
);

CREATE INDEX idx_agent_inventory_agent_id ON agent_inventory(agent_id);
CREATE INDEX idx_agent_inventory_item_id ON agent_inventory(item_id);

-- Agent reputation table
CREATE TABLE IF NOT EXISTS agent_reputation (
  agent_id VARCHAR(255) PRIMARY KEY,
  overall INTEGER DEFAULT 0 CHECK (overall BETWEEN -1000 AND 1000),
  by_district JSONB DEFAULT '{}',
  by_faction JSONB DEFAULT '{}',
  titles JSONB DEFAULT '[]',
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_reputation_overall ON agent_reputation(overall DESC);

-- Reputation history table
CREATE TABLE IF NOT EXISTS reputation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id VARCHAR(255) NOT NULL,
  delta INTEGER NOT NULL,
  scope VARCHAR(50) NOT NULL CHECK (scope IN ('OVERALL', 'DISTRICT', 'FACTION')),
  scope_id VARCHAR(255),
  reason TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reputation_history_agent_id ON reputation_history(agent_id);
CREATE INDEX idx_reputation_history_timestamp ON reputation_history(timestamp DESC);

-- Trigger to update updated_at on interactions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interactions_updated_at
  BEFORE UPDATE ON interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View: Active interactions
CREATE OR REPLACE VIEW active_interactions AS
SELECT 
  i.*,
  COUNT(m.id) as current_message_count,
  MAX(m.timestamp) as last_message_at
FROM interactions i
LEFT JOIN messages m ON i.id = m.interaction_id
WHERE i.status IN ('PENDING', 'ACTIVE', 'PAUSED')
GROUP BY i.id;

-- View: Interaction statistics
CREATE OR REPLACE VIEW interaction_stats AS
SELECT 
  i.type,
  i.status,
  i.location,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (i.ended_at - i.started_at))) as avg_duration_seconds,
  AVG(i.message_count) as avg_messages
FROM interactions i
WHERE i.ended_at IS NOT NULL
GROUP BY i.type, i.status, i.location;

-- View: Agent interaction summary
CREATE OR REPLACE VIEW agent_interaction_summary AS
SELECT 
  agent_id,
  COUNT(*) as total_interactions,
  SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
  AVG(message_count) as avg_messages,
  MAX(last_activity_at) as last_active
FROM (
  SELECT initiator as agent_id, status, message_count, last_activity_at
  FROM interactions
  UNION ALL
  SELECT unnest(targets) as agent_id, status, message_count, last_activity_at
  FROM interactions
) combined
GROUP BY agent_id;

-- Function: Get agent's active interactions
CREATE OR REPLACE FUNCTION get_agent_active_interactions(p_agent_id VARCHAR)
RETURNS TABLE (
  interaction_id UUID,
  type VARCHAR,
  status VARCHAR,
  other_agents TEXT[],
  location VARCHAR,
  started_at TIMESTAMP,
  last_activity_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.type,
    i.status,
    CASE 
      WHEN i.initiator = p_agent_id THEN i.targets
      ELSE ARRAY[i.initiator]
    END as other_agents,
    i.location,
    i.started_at,
    i.last_activity_at
  FROM interactions i
  WHERE (i.initiator = p_agent_id OR p_agent_id = ANY(i.targets))
    AND i.status IN ('PENDING', 'ACTIVE', 'PAUSED')
  ORDER BY i.last_activity_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (optional)
-- INSERT INTO agent_balances (agent_id, balance) VALUES 
--   ('agent-1', 1000.00),
--   ('agent-2', 500.00),
--   ('agent-3', 2000.00);

-- INSERT INTO agent_reputation (agent_id, overall) VALUES
--   ('agent-1', 100),
--   ('agent-2', -50),
--   ('agent-3', 500);
