-- SIP Attendance System Migration
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Add is_sip column to events table (marks event as a SIP class)
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_sip BOOLEAN DEFAULT false;

-- 2. Add SIP attendance tracking columns to event_registrations table
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS sip_approved BOOLEAN DEFAULT false;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS sip_approved_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS sip_denied BOOLEAN DEFAULT false;

-- 3. Create an index for faster SIP event queries
CREATE INDEX IF NOT EXISTS idx_events_is_sip ON events(is_sip) WHERE is_sip = true;

-- 4. Create an index for faster SIP attendance lookups
CREATE INDEX IF NOT EXISTS idx_event_registrations_sip_approved ON event_registrations(sip_approved) WHERE sip_approved = true;

-- 5. IMPORTANT: Create a trigger to prevent deletion of approved SIP attendance records
-- This ensures approved records are permanently stored ("glued")
CREATE OR REPLACE FUNCTION prevent_sip_approved_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.sip_approved = true THEN
    RAISE EXCEPTION 'Cannot delete approved SIP attendance records. These records are permanent.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_sip_delete ON event_registrations;
CREATE TRIGGER trigger_prevent_sip_delete
  BEFORE DELETE ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sip_approved_delete();

-- 6. Create a trigger to prevent modification of approved SIP attendance records
CREATE OR REPLACE FUNCTION prevent_sip_approved_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.sip_approved = true AND (
    NEW.sip_approved IS DISTINCT FROM OLD.sip_approved OR
    NEW.sip_approved_at IS DISTINCT FROM OLD.sip_approved_at
  ) THEN
    RAISE EXCEPTION 'Cannot modify approved SIP attendance records. These records are permanent.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_sip_update ON event_registrations;
CREATE TRIGGER trigger_prevent_sip_update
  BEFORE UPDATE ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sip_approved_update();

-- Done! Approved SIP attendance records are now permanently protected.
