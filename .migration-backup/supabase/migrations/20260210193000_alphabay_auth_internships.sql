-- ALPHABAY X auth + internships module (idempotent)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_role') THEN
    CREATE TYPE public.profile_role AS ENUM ('admin', 'student');
  END IF;
END $$;

-- Ensure profiles has the required role-aware columns
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS role public.profile_role NOT NULL DEFAULT 'student';

-- Backfill name from existing full_name when present
UPDATE public.profiles
SET name = COALESCE(name, full_name)
WHERE name IS NULL;

-- Keep existing email/full_name compatibility but ensure role exists for routing

CREATE TABLE IF NOT EXISTS public.internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  image_url TEXT NOT NULL,
  internship_link TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internships_created_at ON public.internships(created_at DESC);

-- Auto-create profile rows for new auth users with student role
CREATE OR REPLACE FUNCTION public.handle_new_user_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'full_name',
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    name = COALESCE(public.profiles.name, EXCLUDED.name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile_role ON auth.users;
CREATE TRIGGER on_auth_user_created_profile_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile_role();

-- Helper to check admin from profiles.role
CREATE OR REPLACE FUNCTION public.is_profiles_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Profiles self read" ON public.profiles;
CREATE POLICY "Profiles self read"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_profiles_admin());

DROP POLICY IF EXISTS "Profiles self update" ON public.profiles;
CREATE POLICY "Profiles self update"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.is_profiles_admin())
  WITH CHECK (auth.uid() = id OR public.is_profiles_admin());

-- Internships policies
DROP POLICY IF EXISTS "Internships read for authenticated users" ON public.internships;
CREATE POLICY "Internships read for authenticated users"
  ON public.internships
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Internships admin insert" ON public.internships;
CREATE POLICY "Internships admin insert"
  ON public.internships
  FOR INSERT
  WITH CHECK (public.is_profiles_admin());

DROP POLICY IF EXISTS "Internships admin update" ON public.internships;
CREATE POLICY "Internships admin update"
  ON public.internships
  FOR UPDATE
  USING (public.is_profiles_admin())
  WITH CHECK (public.is_profiles_admin());

DROP POLICY IF EXISTS "Internships admin delete" ON public.internships;
CREATE POLICY "Internships admin delete"
  ON public.internships
  FOR DELETE
  USING (public.is_profiles_admin());

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
