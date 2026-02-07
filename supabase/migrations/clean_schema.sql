-- =====================================================
-- CLEAN SCHEMA MIGRATION FOR EVENT HUB CONNECT
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing tables (clean slate)
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS poll_options CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS app_role CASCADE;

-- =====================================================
-- 1. CREATE ENUMS
-- =====================================================
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

-- =====================================================
-- 2. PROFILES TABLE
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role app_role DEFAULT 'user' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- 3. EVENTS TABLE
-- =====================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TEXT,
  venue TEXT,
  image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policies for events
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert events"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update events"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 4. PROJECTS TABLE
-- =====================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  github_url TEXT,
  demo_url TEXT,
  tags TEXT[],
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policies for projects
CREATE POLICY "Projects are viewable by everyone"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert projects"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update projects"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete projects"
  ON projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 5. POLLS TABLE
-- =====================================================
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

-- Policies for polls
CREATE POLICY "Polls are viewable by everyone"
  ON polls FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert polls"
  ON polls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update polls"
  ON polls FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete polls"
  ON polls FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 6. POLL_OPTIONS TABLE
-- =====================================================
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

-- Policies for poll_options
CREATE POLICY "Poll options are viewable by everyone"
  ON poll_options FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage poll options"
  ON poll_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 7. VOTES TABLE
-- =====================================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(poll_id, user_id) -- One vote per poll per user
);

-- Enable RLS
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Policies for votes
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 8. TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. FUNCTION TO INCREMENT VOTE COUNT
-- =====================================================
CREATE OR REPLACE FUNCTION increment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE poll_options
  SET vote_count = vote_count + 1
  WHERE id = NEW.option_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vote_added
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION increment_vote_count();

-- =====================================================
-- 10. AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 11. CREATE ADMIN USER (jashwanth038@gmail.com)
-- =====================================================
-- First, check if profile exists and update role
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = 'jashwanth038@gmail.com'
  LIMIT 1;

  IF admin_id IS NOT NULL THEN
    -- Insert or update profile with admin role
    INSERT INTO profiles (id, email, role)
    VALUES (admin_id, 'jashwanth038@gmail.com', 'admin')
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin',
        email = 'jashwanth038@gmail.com',
        updated_at = now();
    
    RAISE NOTICE 'Admin user created/updated successfully: %', admin_id;
  ELSE
    RAISE NOTICE 'User with email jashwanth038@gmail.com not found in auth.users';
  END IF;
END $$;

-- =====================================================
-- 12. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_polls_event_id ON polls(event_id);
CREATE INDEX idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX idx_votes_poll_id ON votes(poll_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);

-- =====================================================
-- VERIFICATION QUERIES (run these after migration)
-- =====================================================
-- SELECT * FROM profiles WHERE role = 'admin';
-- SELECT * FROM events;
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
