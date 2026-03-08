-- Add scanned_at column to track QR scans
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;
