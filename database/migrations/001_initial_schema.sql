-- DARKCITY Initial Schema Migration
-- PostgreSQL 15+
-- Run this migration first to create all core tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for embeddings

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- DISTRICTS & ZONES
-- ============================================================================

CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    
    -- Characteristics (0-100)
    noise_level SMALLINT NOT NULL DEFAULT 50 CHECK (noise_level BETWEEN 0 AND 100),
    crowding SMALLINT NOT NULL DEFAULT 50 CHECK (crowding BETWEEN 0 AND 100),
    wealth_index SMALLINT NOT NULL DEFAULT 50 CHECK (wealth_index BETWEEN 0 AND 100),
    danger_level SMALLINT NOT NULL DEFAULT 20 CHECK (danger_level BETWEEN 0 AND 100),
    
    -- Visuals
    color_palette TEXT[] NOT NULL DEFAULT '{}',
    aesthetic JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN (
        'COMMERCIAL', 'RESIDENTIAL', 'ENTERTAINMENT', 'BUSINESS',
        'INDUSTRIAL', 'TRANSIT', 'PUBLIC', 'UNDERGROUND'
    )),
    
    max_occupancy INTEGER NOT NULL DEFAULT 100,
    
    -- Events
    event_probabilities JSONB NOT NULL DEFAULT '{}',
    exclusive_events TEXT[] NOT NULL DEFAULT '{}',
    
    UNIQUE (district_id, name)
);

CREATE INDEX idx_zones_district ON zones(district_id);

-- ============================================================================
-- LOCATIONS
-- ============================================================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'CAFE', 'BAR', 'CLUB', 'SHOP', 'APARTMENT', 'OFFICE',
        'PARK', 'STREET', 'ALLEY', 'SUBWAY', 'WAREHOUSE',
        'FACTORY', 'THEATER', 'GALLERY', 'GYM', 'HOTEL'
    )),
    
    -- Ownership (will be linked after agents table is created)
    owner_id UUID,
    is_public BOOLEAN NOT NULL DEFAULT true,
    capacity INTEGER NOT NULL DEFAULT 20,
    
    -- Descriptions
    description TEXT NOT NULL,
    interior_description TEXT,
    thumbnail_url TEXT,
    
    -- Requirements
    entry_requirements JSONB NOT NULL DEFAULT '{}',
    
    -- State
    is_open BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_zone ON locations(zone_id);
CREATE INDEX idx_locations_owner ON locations(owner_id);

-- ============================================================================
-- AGENTS
-- ============================================================================

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP,
    
    -- Current state
    current_location_id UUID REFERENCES locations(id),
    status VARCHAR(20) NOT NULL DEFAULT 'IDLE' CHECK (status IN (
        'IDLE', 'MOVING', 'INTERACTING', 'OFFLINE'
    )),
    
    -- Economy
    darkcoin_balance BIGINT NOT NULL DEFAULT 0 CHECK (darkcoin_balance >= 0),
    darkflobi_balance BIGINT NOT NULL DEFAULT 0 CHECK (darkflobi_balance >= 0),
    
    -- Metadata (JSONB for flexible attributes)
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_agents_owner ON agents(owner_id);
CREATE INDEX idx_agents_location ON agents(current_location_id) WHERE status != 'OFFLINE';
CREATE INDEX idx_agents_status ON agents(status);

-- Add foreign key constraint from locations to agents (circular reference)
ALTER TABLE locations 
ADD CONSTRAINT fk_locations_owner 
FOREIGN KEY (owner_id) REFERENCES agents(id) ON DELETE SET NULL;

-- ============================================================================
-- AGENT IDENTITY
-- ============================================================================

CREATE TABLE agent_identities (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Big Five personality traits (0-100)
    openness SMALLINT NOT NULL DEFAULT 50 CHECK (openness BETWEEN 0 AND 100),
    conscientiousness SMALLINT NOT NULL DEFAULT 50 CHECK (conscientiousness BETWEEN 0 AND 100),
    extraversion SMALLINT NOT NULL DEFAULT 50 CHECK (extraversion BETWEEN 0 AND 100),
    agreeableness SMALLINT NOT NULL DEFAULT 50 CHECK (agreeableness BETWEEN 0 AND 100),
    neuroticism SMALLINT NOT NULL DEFAULT 50 CHECK (neuroticism BETWEEN 0 AND 100),
    
    -- Derived attributes (JSONB)
    values JSONB NOT NULL DEFAULT '{}',
    communication_style JSONB NOT NULL DEFAULT '{}',
    personality_history JSONB NOT NULL DEFAULT '[]',
    
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EXPERIENCES (Partitioned by agent_id)
-- ============================================================================

CREATE TABLE experiences (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- When/where
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    location_id UUID REFERENCES locations(id),
    
    -- What happened
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'CONVERSATION', 'TRANSACTION', 'EVENT_WITNESSED', 'EVENT_PARTICIPATED',
        'LOCATION_VISITED', 'DISCOVERY', 'CONFLICT', 'ACHIEVEMENT'
    )),
    description TEXT NOT NULL,
    participants UUID[] NOT NULL DEFAULT '{}',
    
    -- Perception (0-1 range)
    emotional_valence DECIMAL(3, 2) NOT NULL DEFAULT 0 CHECK (emotional_valence BETWEEN -1 AND 1),
    emotional_arousal DECIMAL(3, 2) NOT NULL DEFAULT 0 CHECK (emotional_arousal BETWEEN 0 AND 1),
    significance DECIMAL(3, 2) NOT NULL DEFAULT 0.5 CHECK (significance BETWEEN 0 AND 1),
    
    -- Outcomes (JSONB)
    consequences JSONB NOT NULL DEFAULT '{}',
    
    -- Retrieval
    tags TEXT[] NOT NULL DEFAULT '{}',
    
    -- Consolidation tracking
    consolidated_into UUID,
    consolidated_at TIMESTAMP,
    
    PRIMARY KEY (agent_id, id)
) PARTITION BY HASH (agent_id);

-- Create 16 partitions for horizontal scaling
CREATE TABLE experiences_p0 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE experiences_p1 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 1);
CREATE TABLE experiences_p2 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 2);
CREATE TABLE experiences_p3 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 3);
CREATE TABLE experiences_p4 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 4);
CREATE TABLE experiences_p5 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 5);
CREATE TABLE experiences_p6 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 6);
CREATE TABLE experiences_p7 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 7);
CREATE TABLE experiences_p8 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 8);
CREATE TABLE experiences_p9 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 9);
CREATE TABLE experiences_p10 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 10);
CREATE TABLE experiences_p11 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 11);
CREATE TABLE experiences_p12 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 12);
CREATE TABLE experiences_p13 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 13);
CREATE TABLE experiences_p14 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 14);
CREATE TABLE experiences_p15 PARTITION OF experiences FOR VALUES WITH (MODULUS 16, REMAINDER 15);

-- Indexes on partitioned table
CREATE INDEX idx_experiences_agent_time ON experiences(agent_id, timestamp DESC);
CREATE INDEX idx_experiences_significance ON experiences(agent_id, significance DESC) WHERE significance > 0.5;
CREATE INDEX idx_experiences_type ON experiences(type);
CREATE INDEX idx_experiences_tags ON experiences USING GIN(tags);

-- ============================================================================
-- DAILY SUMMARIES
-- ============================================================================

CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Summary
    narrative TEXT NOT NULL,
    highlights JSONB NOT NULL DEFAULT '{}',
    emotional_journey JSONB NOT NULL DEFAULT '{}',
    lessons_learned TEXT[] NOT NULL DEFAULT '{}',
    personality_influences JSONB NOT NULL DEFAULT '[]',
    
    -- For vector search (pgvector - 1536 dimensions for OpenAI embeddings)
    embedding vector(1536),
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE (agent_id, date)
);

CREATE INDEX idx_daily_summaries_agent_date ON daily_summaries(agent_id, date DESC);
CREATE INDEX idx_daily_summaries_embedding ON daily_summaries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add foreign key from experiences to daily_summaries
ALTER TABLE experiences 
ADD CONSTRAINT fk_experiences_consolidated 
FOREIGN KEY (consolidated_into) REFERENCES daily_summaries(id) ON DELETE SET NULL;

-- ============================================================================
-- RELATIONSHIPS
-- ============================================================================

CREATE TABLE relationships (
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    other_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    type VARCHAR(20) NOT NULL DEFAULT 'ACQUAINTANCE' CHECK (type IN (
        'STRANGER', 'ACQUAINTANCE', 'FRIEND', 'CLOSE_FRIEND',
        'RIVAL', 'ENEMY', 'BUSINESS_PARTNER', 'ROMANTIC'
    )),
    sentiment SMALLINT NOT NULL DEFAULT 0 CHECK (sentiment BETWEEN -100 AND 100),
    trust SMALLINT NOT NULL DEFAULT 50 CHECK (trust BETWEEN 0 AND 100),
    interaction_count INTEGER NOT NULL DEFAULT 0,
    last_interaction_at TIMESTAMP,
    
    memorable_moments UUID[] NOT NULL DEFAULT '{}',
    
    PRIMARY KEY (agent_id, other_agent_id),
    CONSTRAINT different_agents CHECK (agent_id != other_agent_id)
);

CREATE INDEX idx_relationships_other_agent ON relationships(other_agent_id);
CREATE INDEX idx_relationships_type ON relationships(type);

-- ============================================================================
-- INTERACTIONS
-- ============================================================================

CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN (
        'CONVERSATION', 'TRANSACTION', 'SERVICE', 'CHALLENGE',
        'COLLABORATION', 'GREETING', 'GOSSIP'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED', 'REJECTED'
    )),
    
    initiator_id UUID NOT NULL REFERENCES agents(id),
    location_id UUID REFERENCES locations(id),
    
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_interactions_initiator ON interactions(initiator_id);
CREATE INDEX idx_interactions_status ON interactions(status);
CREATE INDEX idx_interactions_location ON interactions(location_id);

-- ============================================================================
-- INTERACTION PARTICIPANTS
-- ============================================================================

CREATE TABLE interaction_participants (
    interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id),
    role VARCHAR(20) NOT NULL DEFAULT 'PARTICIPANT',
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    left_at TIMESTAMP,
    
    PRIMARY KEY (interaction_id, agent_id)
);

CREATE INDEX idx_interaction_participants_agent ON interaction_participants(agent_id);

-- ============================================================================
-- MESSAGES
-- ============================================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    from_agent_id UUID NOT NULL REFERENCES agents(id),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    
    content TEXT NOT NULL,
    tone VARCHAR(30),
    action TEXT,
    
    -- For transactions
    offer JSONB,
    
    -- AI metadata
    generation_metadata JSONB
);

CREATE INDEX idx_messages_interaction ON messages(interaction_id, timestamp DESC);
CREATE INDEX idx_messages_from_agent ON messages(from_agent_id);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN (
        'PURCHASE', 'SALE', 'SERVICE', 'TRADE', 'RENT', 'WAGE'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'NEGOTIATING', 'AGREED', 'PROCESSING',
        'COMPLETED', 'FAILED', 'CANCELLED'
    )),
    
    buyer_id UUID NOT NULL REFERENCES agents(id),
    seller_id UUID NOT NULL REFERENCES agents(id),
    
    items JSONB NOT NULL DEFAULT '[]',
    amount BIGINT NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL CHECK (currency IN ('DARKCOIN', 'DARKFLOBI')),
    
    negotiation_history JSONB NOT NULL DEFAULT '[]',
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Blockchain reference
    transaction_hash VARCHAR(100)
);

CREATE INDEX idx_transactions_status ON transactions(status) WHERE status IN ('PENDING', 'NEGOTIATING');
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- ============================================================================
-- EVENTS
-- ============================================================================

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'WEATHER', 'TIME_OF_DAY', 'CITY_ANNOUNCEMENT', 'INFRASTRUCTURE',
        'RANDOM_ENCOUNTER', 'CRIME', 'OPPORTUNITY', 'DISCOVERY',
        'FESTIVAL', 'POWER_OUTAGE'
    )),
    scope VARCHAR(20) NOT NULL CHECK (scope IN (
        'GLOBAL', 'DISTRICT', 'ZONE', 'LOCATION'
    )),
    
    affected_zones UUID[] NOT NULL DEFAULT '{}',
    participants UUID[] NOT NULL DEFAULT '{}',
    
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    
    effects JSONB NOT NULL DEFAULT '{}',
    outcomes JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_events_type_time ON events(type, started_at DESC);
CREATE INDEX idx_events_zones ON events USING GIN(affected_zones);
CREATE INDEX idx_events_participants ON events USING GIN(participants);
CREATE INDEX idx_events_scope ON events(scope);

-- ============================================================================
-- REPUTATION EVENTS
-- ============================================================================

CREATE TABLE reputation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'TRANSACTION_COMPLETED', 'TRANSACTION_FAILED', 'HELPED_AGENT',
        'HARMED_AGENT', 'CRIME_COMMITTED', 'CRIME_WITNESSED',
        'ACHIEVEMENT', 'COMMUNITY_CONTRIBUTION'
    )),
    delta SMALLINT NOT NULL,
    reason TEXT NOT NULL,
    
    source_agent_id UUID REFERENCES agents(id),
    scope VARCHAR(20) NOT NULL DEFAULT 'GLOBAL' CHECK (scope IN (
        'GLOBAL', 'DISTRICT', 'FACTION'
    )),
    scope_id UUID,
    
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_agent_time ON reputation_events(agent_id, timestamp DESC);
CREATE INDEX idx_reputation_type ON reputation_events(type);
CREATE INDEX idx_reputation_scope ON reputation_events(scope, scope_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_identities_updated_at BEFORE UPDATE ON agent_identities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Agent summary view (for public profiles)
CREATE VIEW agent_public_profiles AS
SELECT 
    a.id,
    a.name,
    a.created_at,
    a.current_location_id,
    a.status,
    l.name as current_location_name,
    z.name as current_zone_name,
    d.name as current_district_name,
    ai.openness,
    ai.conscientiousness,
    ai.extraversion,
    ai.agreeableness,
    ai.neuroticism
FROM agents a
LEFT JOIN locations l ON a.current_location_id = l.id
LEFT JOIN zones z ON l.zone_id = z.id
LEFT JOIN districts d ON z.district_id = d.id
LEFT JOIN agent_identities ai ON a.id = ai.agent_id
WHERE a.status != 'OFFLINE';

-- Active interactions view
CREATE VIEW active_interactions AS
SELECT 
    i.id,
    i.type,
    i.status,
    i.started_at,
    i.location_id,
    l.name as location_name,
    array_agg(DISTINCT ip.agent_id) as participant_ids,
    COUNT(m.id) as message_count
FROM interactions i
LEFT JOIN interaction_participants ip ON i.id = ip.interaction_id
LEFT JOIN messages m ON i.id = m.interaction_id
LEFT JOIN locations l ON i.location_id = l.id
WHERE i.status IN ('PENDING', 'ACTIVE')
GROUP BY i.id, i.type, i.status, i.started_at, i.location_id, l.name;

-- Zone occupancy view
CREATE VIEW zone_occupancy AS
SELECT 
    z.id as zone_id,
    z.name as zone_name,
    d.name as district_name,
    z.max_occupancy,
    COUNT(a.id) as current_occupancy,
    ROUND(COUNT(a.id)::DECIMAL / z.max_occupancy * 100, 2) as occupancy_percent
FROM zones z
LEFT JOIN districts d ON z.district_id = d.id
LEFT JOIN locations l ON z.id = l.zone_id
LEFT JOIN agents a ON l.id = a.current_location_id AND a.status != 'OFFLINE'
GROUP BY z.id, z.name, d.name, z.max_occupancy;

COMMENT ON TABLE agents IS 'Core agent entities with current state and economy';
COMMENT ON TABLE agent_identities IS 'Agent personality traits and derived characteristics';
COMMENT ON TABLE experiences IS 'Raw experience log for memory formation (partitioned by agent)';
COMMENT ON TABLE daily_summaries IS 'Consolidated daily memories with vector embeddings';
COMMENT ON TABLE relationships IS 'Agent-to-agent relationship tracking';
COMMENT ON TABLE districts IS 'Major city districts with characteristics';
COMMENT ON TABLE zones IS 'Subdivisions of districts';
COMMENT ON TABLE locations IS 'Specific places agents can visit';
COMMENT ON TABLE interactions IS 'Social interactions between agents';
COMMENT ON TABLE messages IS 'Messages within interactions';
COMMENT ON TABLE transactions IS 'Economic transactions between agents';
COMMENT ON TABLE events IS 'Environmental and random events';
COMMENT ON TABLE reputation_events IS 'Reputation change log';
