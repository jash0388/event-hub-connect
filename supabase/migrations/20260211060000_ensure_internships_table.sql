-- Ensure internships table exists in environments where earlier migration wasn't applied.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS public.internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  internship_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internships_created_at ON public.internships (created_at DESC);

ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;

-- Keep timestamps updated on edit.
CREATE OR REPLACE FUNCTION public.set_internships_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_internships_updated_at ON public.internships;
CREATE TRIGGER set_internships_updated_at
BEFORE UPDATE ON public.internships
FOR EACH ROW
EXECUTE FUNCTION public.set_internships_updated_at();

-- Helper that does not depend on profiles.role.
CREATE OR REPLACE FUNCTION public.is_user_roles_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Internships read for authenticated users" ON public.internships;
CREATE POLICY "Internships read for authenticated users"
ON public.internships
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Internships admin insert" ON public.internships;
CREATE POLICY "Internships admin insert"
ON public.internships
FOR INSERT
WITH CHECK (public.is_user_roles_admin());

DROP POLICY IF EXISTS "Internships admin update" ON public.internships;
CREATE POLICY "Internships admin update"
ON public.internships
FOR UPDATE
USING (public.is_user_roles_admin())
WITH CHECK (public.is_user_roles_admin());

DROP POLICY IF EXISTS "Internships admin delete" ON public.internships;
CREATE POLICY "Internships admin delete"
ON public.internships
FOR DELETE
USING (public.is_user_roles_admin());

GRANT SELECT ON public.internships TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.internships TO authenticated;

NOTIFY pgrst, 'reload schema';
