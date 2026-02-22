-- DARKCITY Character Database Schema
-- Stores custom characters with all physical and personality attributes

-- ==================== ENUMS ====================
-- Using PostgreSQL enums for type safety

CREATE TYPE body_type AS ENUM (
  'humanoid',
  'creature',
  'robotic',
  'hybrid-organic',
  'hybrid-mechanical',
  'ethereal',
  'eldritch'
);

CREATE TYPE size_class AS ENUM (
  'tiny',
  'small',
  'medium',
  'large',
  'huge',
  'colossal'
);

CREATE TYPE material AS ENUM (
  'flesh',
  'metal',
  'shadow',
  'crystal',
  'stone',
  'energy',
  'void',
  'biomechanical',
  'obsidian',
  'living-metal',
  'smoke',
  'liquid'
);

CREATE TYPE feature AS ENUM (
  'horns',
  'wings',
  'tail',
  'glowing-eyes',
  'glowing-veins',
  'glowing-core',
  'extra-limbs',
  'claws',
  'fangs',
  'armor-plating',
  'tendrils',
  'aura',
  'flames',
  'frost',
  'lightning',
  'void-rifts',
  'mechanical-parts',
  'bio-luminescence'
);

CREATE TYPE eye_type AS ENUM (
  'normal',
  'glowing',
  'void',
  'mechanical',
  'compound',
  'slit'
);

CREATE TYPE mouth_type AS ENUM (
  'normal',
  'fanged',
  'mechanical',
  'void',
  'none',
  'mandibles'
);

CREATE TYPE skin_texture AS ENUM (
  'smooth',
  'scaled',
  'plated',
  'rough',
  'ethereal',
  'metallic'
);

CREATE TYPE combat_style AS ENUM (
  'aggressive',
  'defensive',
  'tactical',
  'berserker',
  'assassin',
  'support',
  'guerrilla'
);

CREATE TYPE social_style AS ENUM (
  'friendly',
  'neutral',
  'cold',
  'manipulative',
  'charismatic',
  'intimidating',
  'mysterious'
);

CREATE TYPE economic_style AS ENUM (
  'trader',
  'hoarder',
  'generous',
  'opportunist',
  'minimalist',
  'investor',
  'scavenger'
);

CREATE TYPE risk_tolerance AS ENUM (
  'reckless',
  'bold',
  'moderate',
  'cautious',
  'paranoid'
);

-- ==================== MAIN TABLES ====================

-- Characters table
CREATE TABLE characters (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  
  -- Creator info
  created_by VARCHAR(255) NOT NULL,  -- Agent/user ID
  
  -- Identity
  name VARCHAR(100) NOT NULL,
  title VARCHAR(200),
  faction VARCHAR(100),
  backstory TEXT,
  age VARCHAR(50),  -- Can be numeric or descriptive
  pronouns VARCHAR(50) DEFAULT 'they/them',
  
  -- Physical appearance
  body_type body_type NOT NULL,
  size_class size_class NOT NULL,
  height_feet DECIMAL(5,2) NOT NULL CHECK (height_feet > 0),
  primary_material material NOT NULL,
  secondary_material material,
  
  -- Colors (stored as hex codes)
  color_primary VARCHAR(7) NOT NULL,
  color_secondary VARCHAR(7) NOT NULL,
  color_eyes VARCHAR(7) NOT NULL,
  color_glow VARCHAR(7),
  color_energy VARCHAR(7),
  
  -- Facial features
  eye_count INTEGER DEFAULT 2 CHECK (eye_count >= 0 AND eye_count <= 8),
  eye_type eye_type DEFAULT 'normal',
  mouth_type mouth_type DEFAULT 'normal',
  has_nose BOOLEAN DEFAULT true,
  skin_texture skin_texture DEFAULT 'smooth',
  
  -- Description
  appearance_description TEXT,
  
  -- Personality - combat
  combat_style combat_style NOT NULL,
  
  -- Personality - social
  social_style social_style NOT NULL,
  
  -- Personality - economic
  economic_style economic_style NOT NULL,
  
  -- Personality - risk
  risk_tolerance risk_tolerance NOT NULL,
  
  -- Personality - numeric traits (0-100)
  aggression INTEGER CHECK (aggression >= 0 AND aggression <= 100),
  curiosity INTEGER CHECK (curiosity >= 0 AND curiosity <= 100),
  loyalty INTEGER CHECK (loyalty >= 0 AND loyalty <= 100),
  ambition INTEGER CHECK (ambition >= 0 AND ambition <= 100),
  creativity INTEGER CHECK (creativity >= 0 AND creativity <= 100),
  empathy INTEGER CHECK (empathy >= 0 AND empathy <= 100),
  
  -- Motivations
  primary_motivation TEXT NOT NULL,
  secondary_motivation TEXT,
  
  -- Searchability
  tags TEXT[],  -- Array of tags
  
  -- Indexes for common queries
  CONSTRAINT valid_colors CHECK (
    color_primary ~ '^#[0-9A-Fa-f]{6}$' AND
    color_secondary ~ '^#[0-9A-Fa-f]{6}$' AND
    color_eyes ~ '^#[0-9A-Fa-f]{6}$' AND
    (color_glow IS NULL OR color_glow ~ '^#[0-9A-Fa-f]{6}$') AND
    (color_energy IS NULL OR color_energy ~ '^#[0-9A-Fa-f]{6}$')
  )
);

-- Character features (many-to-many relationship)
CREATE TABLE character_features (
  id SERIAL PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  feature feature NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(character_id, feature)
);

-- Facial markings (scars, tattoos, glyphs)
CREATE TABLE character_markings (
  id SERIAL PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  marking_type VARCHAR(50),  -- 'scar', 'tattoo', 'glyph', etc.
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Character desires
CREATE TABLE character_desires (
  id SERIAL PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  desire TEXT NOT NULL,
  priority INTEGER DEFAULT 1,  -- 1 = highest
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Character fears
CREATE TABLE character_fears (
  id SERIAL PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  fear TEXT NOT NULL,
  intensity INTEGER DEFAULT 50 CHECK (intensity >= 0 AND intensity <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Character relationships (for future expansion)
CREATE TABLE character_relationships (
  id SERIAL PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  related_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50),  -- 'ally', 'enemy', 'rival', etc.
  strength INTEGER DEFAULT 50 CHECK (strength >= -100 AND strength <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT no_self_relationship CHECK (character_id != related_character_id),
  UNIQUE(character_id, related_character_id)
);

-- ==================== INDEXES ====================

-- Performance indexes
CREATE INDEX idx_characters_created_by ON characters(created_by);
CREATE INDEX idx_characters_body_type ON characters(body_type);
CREATE INDEX idx_characters_faction ON characters(faction);
CREATE INDEX idx_characters_combat_style ON characters(combat_style);
CREATE INDEX idx_characters_created_at ON characters(created_at DESC);
CREATE INDEX idx_characters_tags ON characters USING GIN(tags);

-- Full-text search
CREATE INDEX idx_characters_name_search ON characters USING GIN(to_tsvector('english', name));
CREATE INDEX idx_characters_backstory_search ON characters USING GIN(to_tsvector('english', backstory));

-- Feature lookup
CREATE INDEX idx_character_features_character ON character_features(character_id);
CREATE INDEX idx_character_features_feature ON character_features(feature);

-- ==================== FUNCTIONS ====================

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Character feature count constraint
CREATE OR REPLACE FUNCTION check_feature_count()
RETURNS TRIGGER AS $$
DECLARE
  feature_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO feature_count
  FROM character_features
  WHERE character_id = NEW.character_id;
  
  IF feature_count >= 8 THEN
    RAISE EXCEPTION 'Character cannot have more than 8 features';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_features
  BEFORE INSERT ON character_features
  FOR EACH ROW
  EXECUTE FUNCTION check_feature_count();

-- ==================== VIEWS ====================

-- Complete character view with aggregated data
CREATE VIEW character_complete AS
SELECT 
  c.*,
  ARRAY_AGG(DISTINCT cf.feature) FILTER (WHERE cf.feature IS NOT NULL) as features,
  ARRAY_AGG(DISTINCT cm.description) FILTER (WHERE cm.description IS NOT NULL) as markings,
  ARRAY_AGG(DISTINCT cd.desire ORDER BY cd.priority) FILTER (WHERE cd.desire IS NOT NULL) as desires,
  ARRAY_AGG(DISTINCT cfe.fear) FILTER (WHERE cfe.fear IS NOT NULL) as fears
FROM characters c
LEFT JOIN character_features cf ON c.id = cf.character_id
LEFT JOIN character_markings cm ON c.id = cm.character_id
LEFT JOIN character_desires cd ON c.id = cd.character_id
LEFT JOIN character_fears cfe ON c.id = cfe.character_id
GROUP BY c.id;

-- Character search view
CREATE VIEW character_search AS
SELECT 
  id,
  name,
  title,
  body_type,
  size_class,
  combat_style,
  social_style,
  faction,
  tags,
  created_at,
  to_tsvector('english', name || ' ' || COALESCE(backstory, '') || ' ' || COALESCE(title, '')) as search_vector
FROM characters;

-- ==================== SAMPLE DATA ====================

-- Insert a sample character (Void Walker)
INSERT INTO characters (
  created_by, name, title, backstory, pronouns,
  body_type, size_class, height_feet, primary_material, secondary_material,
  color_primary, color_secondary, color_eyes, color_glow,
  eye_count, eye_type, mouth_type, has_nose, skin_texture,
  appearance_description,
  combat_style, social_style, economic_style, risk_tolerance,
  aggression, curiosity, loyalty, ambition, creativity, empathy,
  primary_motivation, tags
) VALUES (
  'system',
  'Zyx''thar',
  'The Void Walker',
  'Born from the spaces between reality, Zyx''thar exists on the edge of comprehension.',
  'they/them',
  'ethereal', 'medium', 6.0, 'shadow', 'void',
  '#1a0033', '#330066', '#9933ff', '#6600cc',
  2, 'void', 'void', false, 'ethereal',
  'A being of pure darkness, barely tangible in the material realm.',
  'assassin', 'mysterious', 'hoarder', 'bold',
  60, 80, 40, 70, 85, 30,
  'Uncover forbidden knowledge',
  ARRAY['void', 'shadow', 'mysterious']
) RETURNING id;

-- Add features to the sample character
INSERT INTO character_features (character_id, feature)
SELECT id, unnest(ARRAY['glowing-eyes'::feature, 'aura'::feature, 'void-rifts'::feature])
FROM characters WHERE name = 'Zyx''thar';

-- Add desires
INSERT INTO character_desires (character_id, desire, priority)
SELECT id, 'secrets', 1 FROM characters WHERE name = 'Zyx''thar'
UNION ALL
SELECT id, 'power', 2 FROM characters WHERE name = 'Zyx''thar'
UNION ALL
SELECT id, 'solitude', 3 FROM characters WHERE name = 'Zyx''thar';

-- Add fears
INSERT INTO character_fears (character_id, fear, intensity)
SELECT id, 'light', 80 FROM characters WHERE name = 'Zyx''thar'
UNION ALL
SELECT id, 'exposure', 70 FROM characters WHERE name = 'Zyx''thar'
UNION ALL
SELECT id, 'mundanity', 60 FROM characters WHERE name = 'Zyx''thar';

-- ==================== QUERIES (Examples) ====================

-- Find all aggressive robotic characters
-- SELECT * FROM character_complete 
-- WHERE body_type = 'robotic' AND combat_style = 'aggressive';

-- Search characters by text
-- SELECT * FROM character_search 
-- WHERE search_vector @@ to_tsquery('english', 'void & shadow');

-- Get character with all related data
-- SELECT * FROM character_complete WHERE id = '<uuid>';

-- Find characters by feature
-- SELECT c.* FROM characters c
-- JOIN character_features cf ON c.id = cf.character_id
-- WHERE cf.feature = 'wings';
