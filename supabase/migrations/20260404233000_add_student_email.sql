-- Add student_email column to exam_submissions
ALTER TABLE IF EXISTS exam_submissions ADD COLUMN IF NOT EXISTS student_email TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
