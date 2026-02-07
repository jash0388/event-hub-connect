# 🚀 DATABASE SETUP INSTRUCTIONS

## Step 1: Run the Migration in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project: `cqjjbvccldipkqqtqzqc`
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/clean_schema.sql`
6. Paste and click **Run**

## Step 2: Verify the Setup

After running the migration, verify everything is set up correctly:

```sql
-- Check if admin user was created
SELECT id, email, role FROM profiles WHERE role = 'admin';

-- Check tables were created
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

## Step 3: What This Migration Does

✅ **Tables Created:**
- `profiles` - User profiles with role (admin/moderator/user)
- `events` - Event details (title, description, date, time, venue, image)
- `polls` - Poll questions linked to events
- `poll_options` - Options for each poll with vote counts
- `votes` - User votes (one vote per poll per user)

✅ **Security (RLS Policies):**
- Everyone can VIEW events, polls, and poll options
- Only ADMINS can CREATE/EDIT/DELETE events and polls
- Authenticated users can VOTE
- Users can update their own profile

✅ **Admin User:**
- Your email `jashwanth038@gmail.com` is set as admin
- Admin role is enforced at the database level (not just frontend)

✅ **Auto Features:**
- Auto-create profile when user signs up
- Auto-update `updated_at` timestamp on changes
- Auto-increment vote counts when votes are cast
- Indexes for fast queries

## Step 4: Test Admin Access

After running the migration, try logging in as admin:
- Email: `jashwanth038@gmail.com`
- Password: (your password)

The dashboard should now be able to:
- Load events without errors
- Create new events
- Edit/delete events
- Manage polls

## Troubleshooting

**If admin user is not created:**
```sql
-- Manually set your user as admin
UPDATE profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'jashwanth038@gmail.com');
```

**If you get RLS policy errors:**
```sql
-- Check if you're authenticated
SELECT auth.uid();

-- Check your role
SELECT role FROM profiles WHERE id = auth.uid();
```

## Next Steps

After running this migration successfully:
1. ✅ Database schema is ready
2. ✅ Admin access is set up
3. 🔄 I'll fix the frontend code to match this schema
4. 🔄 Remove all fake data
5. 🔄 Improve UI/UX

**Let me know once you've run the migration and I'll proceed with fixing the frontend!**
