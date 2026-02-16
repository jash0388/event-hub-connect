-- Add photos and videos columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS videos text[] DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN events.photos IS 'Array of photo URLs for the event';
COMMENT ON COLUMN events.videos IS 'Array of video URLs for the event';
