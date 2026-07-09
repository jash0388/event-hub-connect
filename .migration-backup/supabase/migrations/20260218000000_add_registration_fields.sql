-- Add registration fields to event_attendees table
ALTER TABLE event_attendees
ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE event_attendees
ADD COLUMN IF NOT EXISTS roll_number TEXT;

ALTER TABLE event_attendees
ADD COLUMN IF NOT EXISTS year TEXT;
