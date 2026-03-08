-- Make internships publicly readable (no login required)
DROP POLICY IF EXISTS "Internships read for authenticated users" ON public.internships;
CREATE POLICY "Internships read for anyone"
  ON public.internships
  FOR SELECT
  USING (true);

-- Allow anyone to insert internships (for sync)
DROP POLICY IF EXISTS "Internships admin insert" ON public.internships;
CREATE POLICY "Anyone can insert internships"
  ON public.internships
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to update
DROP POLICY IF EXISTS "Internships admin update" ON public.internships;
CREATE POLICY "Anyone can update internships"
  ON public.internships
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete
DROP POLICY IF EXISTS "Internships admin delete" ON public.internships;
CREATE POLICY "Anyone can delete internships"
  ON public.internships
  FOR DELETE
  USING (true);

-- Grant permissions
GRANT SELECT ON public.internships TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.internships TO authenticated, anon;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
