-- Add profile picture support

ALTER TABLE citizens ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS profile_picture_updated_at TIMESTAMPTZ;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_citizens_profile_picture ON citizens(citizen_id) WHERE profile_picture_url IS NOT NULL;

COMMENT ON COLUMN citizens.profile_picture_url IS 'URL or path to citizen profile picture';
COMMENT ON COLUMN citizens.profile_picture_updated_at IS 'Last time profile picture was changed';
