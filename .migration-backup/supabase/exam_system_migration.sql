-- Exam System Migration
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Create exams table (admin creates tests here)
CREATE TABLE IF NOT EXISTS exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  max_violations INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create exam_questions table
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq', -- 'mcq' or 'paragraph'
  options JSONB DEFAULT '[]', -- Array of option strings for MCQ
  correct_answer TEXT, -- The correct option text for MCQ (for auto-grading)
  marks INTEGER NOT NULL DEFAULT 5,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create exam_submissions table (user test results)
CREATE TABLE IF NOT EXISTS exam_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  answers JSONB DEFAULT '{}', -- {question_id: answer_text}
  score INTEGER DEFAULT 0,
  total_marks INTEGER DEFAULT 0,
  violations INTEGER DEFAULT 0,
  time_used_seconds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed', -- 'completed' or 'auto_submitted'
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_submissions_exam_id ON exam_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_submissions_user_id ON exam_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_is_active ON exams(is_active) WHERE is_active = true;

-- 5. Enable RLS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies - Allow all authenticated operations (simple setup)
CREATE POLICY "Allow all access to exams" ON exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to exam_questions" ON exam_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to exam_submissions" ON exam_submissions FOR ALL USING (true) WITH CHECK (true);

-- Done! Now you can create tests from the admin dashboard.
