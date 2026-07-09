-- Add user_display_name column to task_submissions for reliable name resolution
ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS user_display_name TEXT;
