-- Fix UUID issue for Firebase users - Drop ALL policies
-- This is a simpler approach - drop all policies, alter columns, recreate

-- Drop ALL policies on task_submissions
DROP POLICY IF EXISTS "Users can view their own submissions" ON task_submissions;
DROP POLICY IF EXISTS "Users can submit answers" ON task_submissions;
DROP POLICY IF EXISTS "Admins can manage submissions" ON task_submissions;

-- Drop ALL policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles self read" ON profiles;
DROP POLICY IF EXISTS "Profiles self update" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Also try to drop any remaining policies using CASCADE
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles CASCADE;

-- Drop foreign key constraints
ALTER TABLE task_submissions DROP CONSTRAINT IF EXISTS task_submissions_user_id_fkey;

-- Also drop the profiles foreign key (profiles references auth.users)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Change column types
ALTER TABLE task_submissions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE profiles ALTER COLUMN id TYPE TEXT;
-- Recreate foreign key
ALTER TABLE task_submissions 
ADD CONSTRAINT task_submissions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE POLICY "Users can view their own submissions" ON task_submissions
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can submit answers" ON task_submissions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "Profiles self read" ON profiles
  FOR SELECT USING (auth.uid()::text = id);
