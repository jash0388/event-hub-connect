-- Add QR code column to event_registrations
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Create index for QR lookup
DROP INDEX IF EXISTS idx_event_registrations_qr;
CREATE INDEX idx_event_registrations_qr ON event_registrations(qr_code);
