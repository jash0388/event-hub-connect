# Database Setup Requirements

This document outlines the expected database schema for the Event Hub Connect application.

## Required Tables

### profiles Table

The application expects a `profiles` table with the following structure:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Columns:
- `id` (uuid): Primary key that references auth.users(id)
- `role` (text): User role - must be one of: 'admin', 'moderator', or 'user'
- `created_at` (timestamptz): Timestamp of profile creation
- `updated_at` (timestamptz): Timestamp of last profile update

#### Admin User Setup:

To create an admin user, you need to:

1. Sign up a user through Supabase Auth (can be done via Supabase Dashboard or signup flow)
2. Update the user's role in the profiles table:

```sql
-- Replace 'user-email@example.com' with the actual admin email
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'user-email@example.com'
);
```

Or if you have the user's UUID:

```sql
-- Replace 'user-uuid-here' with the actual UUID
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'user-uuid-here';
```

## Row Level Security (RLS) - Recommended

It's recommended to enable RLS on the profiles table and create appropriate policies:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile (except role)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Allow public read of profiles (adjust based on your needs)
CREATE POLICY "Public profiles are viewable" ON profiles
  FOR SELECT
  USING (true);
```

## Trigger for Auto-Creating Profiles

Set up a trigger to automatically create a profile when a new user signs up:

```sql
-- Function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Verification

After setting up the database, verify:

1. The profiles table exists
2. At least one user has role = 'admin'
3. The trigger is working (new signups automatically create profile records)
4. RLS policies are correctly configured

You can verify admin users with:

```sql
SELECT u.email, p.role, p.created_at
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE p.role = 'admin';
```
