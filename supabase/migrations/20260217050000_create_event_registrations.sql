-- Create event_registrations table for direct event registration
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    year TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own registrations
CREATE POLICY "Users can view own registrations"
ON event_registrations FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own registrations
CREATE POLICY "Users can create registrations"
ON event_registrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own registrations
CREATE POLICY "Users can delete own registrations"
ON event_registrations FOR DELETE
USING (auth.uid() = user_id);

-- Allow public read access for viewing registrations (for checking if user registered)
CREATE POLICY "Public can view registrations"
ON event_registrations FOR SELECT
USING (true);

-- Allow authenticated users to insert registrations
CREATE POLICY "Authenticated users can insert"
ON event_registrations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_user 
ON event_registrations(event_id, user_id);
