# QR Code Fix - Database Setup

## Problem
The QR code feature requires a database column that doesn't exist yet.

## Solution
Run the following SQL in your Supabase SQL Editor:

1. Go to https://supabase.com
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Copy and paste this SQL:

```sql
-- Add QR code field to event_attendees table
ALTER TABLE event_attendees 
ADD COLUMN IF NOT EXISTS qr_code TEXT;

ALTER TABLE event_attendees
ADD COLUMN IF NOT EXISTS qr_verified BOOLEAN DEFAULT false;

ALTER TABLE event_attendees
ADD COLUMN IF NOT EXISTS qr_verified_at TIMESTAMPTZ;

-- Create index for faster QR lookups
CREATE INDEX IF NOT EXISTS idx_event_attendees_qr_code ON event_attendees(qr_code);
```

5. Click "Run" to execute

After this, refresh your browser and register for an event. The QR code will appear in your profile!
