-- DARKCITY Quest System Database Schema

-- Quests table
CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  reward_sol REAL NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  max_completions INTEGER NOT NULL DEFAULT -1,
  current_completions INTEGER NOT NULL DEFAULT 0,
  requirements TEXT NOT NULL, -- JSON
  metadata TEXT NOT NULL, -- JSON
  is_active INTEGER NOT NULL DEFAULT 1
);

-- Quest acceptances/completions
CREATE TABLE IF NOT EXISTS quest_acceptances (
  id TEXT PRIMARY KEY,
  quest_id TEXT NOT NULL,
  agent_wallet TEXT NOT NULL,
  accepted_at INTEGER NOT NULL,
  submitted_at INTEGER,
  completed_at INTEGER,
  status TEXT NOT NULL,
  submission TEXT, -- JSON
  payout_tx_signature TEXT,
  FOREIGN KEY (quest_id) REFERENCES quests(id)
);

-- Agent reputation
CREATE TABLE IF NOT EXISTS agent_reputation (
  agent_wallet TEXT PRIMARY KEY,
  total_quests INTEGER NOT NULL DEFAULT 0,
  completed_quests INTEGER NOT NULL DEFAULT 0,
  rejected_quests INTEGER NOT NULL DEFAULT 0,
  total_earned REAL NOT NULL DEFAULT 0,
  reputation INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'newcomer',
  last_active_at INTEGER NOT NULL,
  joined_at INTEGER NOT NULL
);

-- Quest generation history
CREATE TABLE IF NOT EXISTS quest_generation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quest_id TEXT NOT NULL,
  generated_at INTEGER NOT NULL,
  template_used TEXT NOT NULL,
  FOREIGN KEY (quest_id) REFERENCES quests(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quests_type ON quests(type);
CREATE INDEX IF NOT EXISTS idx_quests_active ON quests(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_quests_reward ON quests(reward_sol);
CREATE INDEX IF NOT EXISTS idx_acceptances_agent ON quest_acceptances(agent_wallet);
CREATE INDEX IF NOT EXISTS idx_acceptances_quest ON quest_acceptances(quest_id);
CREATE INDEX IF NOT EXISTS idx_acceptances_status ON quest_acceptances(status);
CREATE INDEX IF NOT EXISTS idx_reputation_tier ON agent_reputation(tier);
CREATE INDEX IF NOT EXISTS idx_reputation_score ON agent_reputation(reputation);
