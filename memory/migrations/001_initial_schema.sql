-- DARKCITY Memory System - Initial Schema
-- PostgreSQL schema for episodic memory and identity core

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AGENTS TABLE
-- ============================================================================

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(user_id, name)
);

CREATE INDEX idx_agents_user_id ON agents(user_id);

-- ============================================================================
-- EXPERIENCES TABLE (Episodic Memory)
-- ============================================================================

CREATE TABLE experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type VARCHAR(50) NOT NULL,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_description TEXT NOT NULL,
    event_location UUID,
    event_participants UUID[] DEFAULT '{}',
    event_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Perception
    emotional_valence REAL NOT NULL CHECK (emotional_valence BETWEEN -1 AND 1),
    emotional_arousal REAL NOT NULL CHECK (emotional_arousal BETWEEN 0 AND 1),
    significance REAL NOT NULL CHECK (significance BETWEEN 0 AND 1),
    surprise REAL NOT NULL CHECK (surprise BETWEEN 0 AND 1),
    
    -- Consequences
    relationship_deltas JSONB DEFAULT '[]'::jsonb,
    resource_deltas JSONB DEFAULT '[]'::jsonb,
    knowledge_gained TEXT[] DEFAULT '{}',
    reputation_deltas JSONB DEFAULT '[]'::jsonb,
    
    -- Tags for filtering
    tags TEXT[] DEFAULT '{}',
    
    -- Consolidation tracking
    consolidated_into UUID,
    consolidated_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitioning by agent_id for scalability
-- (Optional, implement when needed for >100K agents)

CREATE INDEX idx_experiences_agent_id ON experiences(agent_id);
CREATE INDEX idx_experiences_timestamp ON experiences(timestamp DESC);
CREATE INDEX idx_experiences_type ON experiences(type);
CREATE INDEX idx_experiences_significance ON experiences(significance DESC);
CREATE INDEX idx_experiences_participants ON experiences USING GIN(event_participants);
CREATE INDEX idx_experiences_tags ON experiences USING GIN(tags);
CREATE INDEX idx_experiences_consolidated ON experiences(consolidated_into) WHERE consolidated_into IS NOT NULL;

-- ============================================================================
-- DAILY SUMMARIES TABLE
-- ============================================================================

CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Narrative
    narrative TEXT NOT NULL,
    
    -- Highlights
    significant_events UUID[] DEFAULT '{}',
    new_relationships UUID[] DEFAULT '{}',
    relationship_changes JSONB DEFAULT '[]'::jsonb,
    locations_visited UUID[] DEFAULT '{}',
    money_earned DECIMAL(10, 2) DEFAULT 0,
    money_spent DECIMAL(10, 2) DEFAULT 0,
    reputation_changes JSONB DEFAULT '[]'::jsonb,
    
    -- Emotional journey
    dominant_mood VARCHAR(50) NOT NULL,
    mood_progression JSONB DEFAULT '[]'::jsonb,
    stress_level REAL NOT NULL CHECK (stress_level BETWEEN 0 AND 1),
    
    -- Learning
    lessons_learned TEXT[] DEFAULT '{}',
    beliefs_reinforced TEXT[] DEFAULT '{}',
    beliefs_challenged TEXT[] DEFAULT '{}',
    
    -- Personality influences
    personality_influences JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(agent_id, date)
);

CREATE INDEX idx_daily_summaries_agent_id ON daily_summaries(agent_id);
CREATE INDEX idx_daily_summaries_date ON daily_summaries(date DESC);

-- ============================================================================
-- IDENTITY CORE TABLE
-- ============================================================================

CREATE TABLE identity_cores (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Personality (Big Five)
    openness REAL NOT NULL DEFAULT 50 CHECK (openness BETWEEN 0 AND 100),
    conscientiousness REAL NOT NULL DEFAULT 50 CHECK (conscientiousness BETWEEN 0 AND 100),
    extraversion REAL NOT NULL DEFAULT 50 CHECK (extraversion BETWEEN 0 AND 100),
    agreeableness REAL NOT NULL DEFAULT 50 CHECK (agreeableness BETWEEN 0 AND 100),
    neuroticism REAL NOT NULL DEFAULT 50 CHECK (neuroticism BETWEEN 0 AND 100),
    personality_last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    personality_history JSONB DEFAULT '[]'::jsonb,
    
    -- Values and beliefs
    values JSONB DEFAULT '{}'::jsonb,
    
    -- Skills
    skills JSONB DEFAULT '{}'::jsonb,
    
    -- Goals
    short_term_goals JSONB DEFAULT '[]'::jsonb,
    long_term_goals JSONB DEFAULT '[]'::jsonb,
    completed_goals JSONB DEFAULT '[]'::jsonb,
    
    -- Reputation
    reputation_overall REAL NOT NULL DEFAULT 0 CHECK (reputation_overall BETWEEN -100 AND 100),
    reputation_by_district JSONB DEFAULT '{}'::jsonb,
    reputation_by_faction JSONB DEFAULT '{}'::jsonb,
    reputation_titles TEXT[] DEFAULT '{}',
    
    -- Communication style
    vocabulary TEXT[] DEFAULT '{}',
    tone_descriptors TEXT[] DEFAULT '{}',
    topics TEXT[] DEFAULT '{}',
    avoids TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- RELATIONSHIPS TABLE
-- ============================================================================

CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    other_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Relationship details
    type VARCHAR(50) NOT NULL,
    sentiment REAL NOT NULL DEFAULT 0 CHECK (sentiment BETWEEN -100 AND 100),
    trust REAL NOT NULL DEFAULT 0 CHECK (trust BETWEEN 0 AND 100),
    interaction_count INTEGER NOT NULL DEFAULT 0,
    last_interaction TIMESTAMPTZ,
    memorable_moments UUID[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(agent_id, other_agent_id),
    CHECK (agent_id != other_agent_id)
);

CREATE INDEX idx_relationships_agent_id ON relationships(agent_id);
CREATE INDEX idx_relationships_other_agent_id ON relationships(other_agent_id);
CREATE INDEX idx_relationships_type ON relationships(type);
CREATE INDEX idx_relationships_sentiment ON relationships(sentiment DESC);

-- ============================================================================
-- CONSOLIDATION JOBS TABLE
-- ============================================================================

CREATE TABLE consolidation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    experience_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(agent_id, date)
);

CREATE INDEX idx_consolidation_jobs_status ON consolidation_jobs(status);
CREATE INDEX idx_consolidation_jobs_date ON consolidation_jobs(date DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_identity_cores_updated_at
    BEFORE UPDATE ON identity_cores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at
    BEFORE UPDATE ON relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

COMMENT ON TABLE experiences IS 'Episodic memory: immutable log of all agent experiences';
COMMENT ON TABLE daily_summaries IS 'Daily consolidated summaries of agent experiences';
COMMENT ON TABLE identity_cores IS 'Agent identity: personality, values, reputation, style';
COMMENT ON TABLE relationships IS 'Agent-to-agent relationships with sentiment and trust';
COMMENT ON TABLE consolidation_jobs IS 'Nightly consolidation job tracking';
