# AI Agent Context: Supabase Exam & User System

This README is designed to be copied and pasted to AI agents when you are asking them to create or modify web test pages (exam portals) within this project.

---

## 🏗️ 1. Database Schema & State

The project uses **Supabase** for keeping track of Exams, Questions, and Submissions, while Authentication might use a mix of Supabase and Firebase (users have `id` and sometimes `firebase_uid`).

### Table: `exams`
Stores the metadata for a specific test/exam.
- `id` (UUID, Primary Key)
- `title` (Text)
- `description` (Text)
- `duration_minutes` (Integer) - Total time allowed for the test.
- `max_violations` (Integer) - Maximum times a user can change tabs before getting kicked out.
- `is_active` (Boolean) - Whether the exam is currently accepting submissions.
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Table: `exam_questions`
Stores individual questions linked to an exam. In the Admin Dashboard, these are added to the exam details and loaded dynamically on the test page.
- `id` (UUID, Primary Key)
- `exam_id` (UUID, Foreign Key to `exams.id`)
- `question` (Text) - The question text.
- `question_type` (Text) - E.g., `'mcq'`, `'paragraph'`, or `'code'`.
- `options` (Text Array) - Array of string values for MCQ options (e.g., `['A', 'B', 'C', 'D']`).
- `correct_answer` (Text) - The correct string (used for auto-grading MCQs).
- `marks` (Integer) - Points awarded if correct.
- `sort_order` (Integer) - Determines the order questions appear in.
- `created_at` (Timestamp)

### Table: `exam_submissions`
Stores student results upon completion (or termination due to violations).
- `id` (UUID, Primary Key)
- `user_id` (Text/UUID, Foreign Key linking to user)
- `exam_id` (UUID, Foreign Key to `exams.id`)
- `score` (Integer) - Marks obtained by the student.
- `total_marks` (Integer) - Max possible marks for the exam.
- `violations` (Integer) - Number of security violations (tab switches, full-screen exits).
- `time_used_seconds` (Integer) - Total time taken to finish the test.
- `status` (Text) - Usually `'completed'`, `'terminated'`, or `'pending'`.
- `student_name` (Text) - Often stores formatted user info (e.g., `"John Doe (john@example.com)"`).
- `roll_number` (Text) - Registered roll number of the student.
- `submitted_at` (Timestamp)

---

## 👥 2. Registering Users & Authentication

### 🔐 Authentication Context
- The system uses a **hybrid authentication system** combining Supabase and Firebase.
- **New User Flow:** All new user signups and logins are handled via **Firebase Authentication**.
- **Google Authentication:** Users should primarily sign in using Google. This is implemented via Firebase's Google Auth provider.
- **Verification:** For email/password signups, a strict `@gmail.com` filter is applied, and email verification is mandatory.
- **Normalization:** The `useAuth()` hook normalizes Firebase users into a Supabase-compatible `User` object (`pseudoUser`).

### 👤 User Logic for Agents
- When an AI is building a new test page, it should use the `useAuth()` hook to get the current user:
  ```typescript
  const { user, signInWithGoogle, signOut, isFirebaseUser } = useAuth();
  ```
- **Login Requirement:** Ensure the user is authenticated before allowing them to start an exam. If not logged in, show a "Sign in with Google" button.
- **Data Mapping:** When saving results to `exam_submissions`, the `user_id` should be the `user.id` (which is the Firebase UID for new users).

---

## 🔑 3. Environment Variables (Required)

For any new environment or local setup, use these exact values in your `.env` file to ensure the AI agent connects to the correct database and auth services:

```bash
# Supabase Config
VITE_SUPABASE_URL=https://cqjjbvccldipkqqtqzqc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxampidmNjbGRpcGtxcXRxenFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTU5OTcsImV4cCI6MjA4NTk3MTk5N30.VJxcanrSRdEAcnRpCI2zpeWQ7PhvdPiZtRnA5L7RQgc
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_C1H9kJMSkbLHBtrRyI4QjA_SRo561tI

# Firebase Configuration (Google Auth)
VITE_FIREBASE_API_KEY=AIzaSyAW-1JVFs8y8OKPG5qJeJSZsiN1979O2Wc
VITE_FIREBASE_AUTH_DOMAIN=datanauts-652ed.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=datanauts-652ed
VITE_FIREBASE_STORAGE_BUCKET=datanauts-652ed.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=206057381692
VITE_FIREBASE_APP_ID=1:206057381692:web:0969ea6ef357595e74c839
VITE_FIREBASE_MEASUREMENT_ID=G-R94DP41Q53

# AI & LLM Context
VITE_GEMINI_API_KEY=AIzaSyByvtqmSfAQ-YB5YO1EXn_yXepau8sq8M0
VITE_GROQ_API_KEY=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

# Media Config (Cloudinary)
# Replace with your Cloudinary credentials if performing uploads
# VITE_CLOUDINARY_CLOUD_NAME=
# VITE_CLOUDINARY_UPLOAD_PRESET=
```

---

## 📊 4. Data Checklist (Before Testing)

Before asking an AI agent to build a test page, ensure the following data is present in Supabase:
1. **At least one record in `exams` table** (Mark it `is_active = true`).
2. **At least 5-10 questions in `exam_questions` table** linked to that `exam_id`.
3. **Admin User Profile:** Ensure your current user ID is present in the `profiles` table to avoid permission issues.

---

## 🚀 5. How to Create a New Web Test Page (Agent Instructions)

**If an AI is tasked with building a new test/exam page (`page.tsx`), it must follow this execution flow:**

1. **Load Exam Metadata:**
   ```typescript
   const { data: exam } = await supabase
     .from('exams')
     .select('*')
     .eq('id', examId)
     .single();
   ```

2. **Load Questions (From Admin Page data):**
   ```typescript
   const { data: questions } = await supabase
     .from('exam_questions')
     .select('*')
     .eq('exam_id', examId)
     .order('sort_order', { ascending: true });
   ```
   *Note: Because the admin page populates `exam_questions`, the new test page MUST map over these dynamic questions rather than hardcoding anything.*

3. **Enforce Security & Violations:**
   - Track visibility changes (`document.addEventListener("visibilitychange")`).
   - If `document.hidden` is true, increment a `violations` state.
   - If `violations >= exam.max_violations`, force-submit the test with status `'terminated'`.

4. **Grade & Submit:**
   - For `mcq` type questions, compare the user's selected choice with `correct_answer`.
   - Calculate total `score`. 
   - Post to `exam_submissions`:
   ```typescript
   await supabase.from('exam_submissions').insert({
     exam_id: exam.id,
     user_id: currentUser.id,
     score: calculatedScore,
     total_marks: calculatedTotalMarks,
     violations: violationsCount,
     time_used_seconds: totalSecondsTaken,
     student_name: `${currentUser.name} (${currentUser.email})`,
     roll_number: currentUser.roll_number, // Fetch from profile if necessary
     status: 'completed'
   });
   ```

**TL;DR for AI:** Use the `exams` and `exam_questions` tables to render the UI. Enforce the `max_violations` rule. Post the final payload to `exam_submissions` mimicking the exact columns above so it reflects perfectly in the Admin Dashboard!
