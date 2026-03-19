-- Create user_registrations table for additional user details
CREATE TABLE IF NOT EXISTS user_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  year TEXT,
  section TEXT,
  phone TEXT,
  college TEXT,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS to allow Firebase users to register (they use admin client)
ALTER TABLE user_registrations DISABLE ROW LEVEL SECURITY;
