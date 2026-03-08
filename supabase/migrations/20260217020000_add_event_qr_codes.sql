-- Add QR code field to event_attendees table
ALTER TABLE event_attendees 
ADD COLUMN IF NOT EXISTS qr_code TEXT;

ALTER TABLE event_attendees
ADD COLUMN IF NOT EXISTS qr_verified BOOLEAN DEFAULT false;

ALTER TABLE event_attendees
ADD COLUMN IF NOT EXISTS qr_verified_at TIMESTAMPTZ;

-- Create index for faster QR lookups
CREATE INDEX IF NOT EXISTS idx_event_attendees_qr_code ON event_attendees(qr_code);
