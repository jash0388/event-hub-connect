-- Hotfix: ensure event discovery schema exists in production databases
-- This migration is fully idempotent and safe to re-run.

ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS time TEXT,
  ADD COLUMN IF NOT EXISTS organizer TEXT,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS popularity_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trending_score INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  college TEXT,
  profile_picture TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL CHECK (char_length(trim(review_text)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL CHECK (char_length(trim(comment_text)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_saved_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  rsvp_status TEXT NOT NULL CHECK (rsvp_status IN ('going', 'interested', 'not_going')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_reviews_event_id ON public.event_reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON public.event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_events_user_id ON public.user_saved_events(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON public.event_attendees(event_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users are publicly readable" ON public.users;
CREATE POLICY "Users are publicly readable"
  ON public.users
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own public profile" ON public.users;
CREATE POLICY "Users can update own public profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own public profile" ON public.users;
CREATE POLICY "Users can insert own public profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.event_reviews;
CREATE POLICY "Anyone can view reviews"
  ON public.event_reviews
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can add their own reviews" ON public.event_reviews;
CREATE POLICY "Users can add their own reviews"
  ON public.event_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can edit their own reviews" ON public.event_reviews;
CREATE POLICY "Users can edit their own reviews"
  ON public.event_reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.event_reviews;
CREATE POLICY "Users can delete own reviews"
  ON public.event_reviews
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can moderate reviews" ON public.event_reviews;
CREATE POLICY "Admins can moderate reviews"
  ON public.event_reviews
  FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view comments" ON public.event_comments;
CREATE POLICY "Anyone can view comments"
  ON public.event_comments
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can add their own comments" ON public.event_comments;
CREATE POLICY "Users can add their own comments"
  ON public.event_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.event_comments;
CREATE POLICY "Users can delete own comments"
  ON public.event_comments
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can moderate comments" ON public.event_comments;
CREATE POLICY "Admins can moderate comments"
  ON public.event_comments
  FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own saved events" ON public.user_saved_events;
CREATE POLICY "Users can view own saved events"
  ON public.user_saved_events
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save own events" ON public.user_saved_events;
CREATE POLICY "Users can save own events"
  ON public.user_saved_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own saved events" ON public.user_saved_events;
CREATE POLICY "Users can remove own saved events"
  ON public.user_saved_events
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view attendees" ON public.event_attendees;
CREATE POLICY "Anyone can view attendees"
  ON public.event_attendees
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can RSVP for themselves" ON public.event_attendees;
CREATE POLICY "Users can RSVP for themselves"
  ON public.event_attendees
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own RSVP" ON public.event_attendees;
CREATE POLICY "Users can update own RSVP"
  ON public.event_attendees
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can clear own RSVP" ON public.event_attendees;
CREATE POLICY "Users can clear own RSVP"
  ON public.event_attendees
  FOR DELETE
  USING (auth.uid() = user_id);

-- Force PostgREST to reload schema cache to avoid stale "column not found" errors.
NOTIFY pgrst, 'reload schema';
