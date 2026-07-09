// Cleanup script: Delete all old Google/Supabase auth users from user_registrations and profiles tables
// Only OTP roll-number users should remain

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cqjjbvccldipkqqtqzqc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxampidmNjbGRpcGtxcXRxenFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM5NTk5NywiZXhwIjoyMDg1OTcxOTk3fQ.X66_viw192Ra2brJpf_XoePPnGvOD5V-A-t5kBQptNg';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function cleanup() {
  console.log('=== Cleaning old Google/Supabase auth user data ===\n');

  // 1. Delete all user_registrations (old Google users)
  console.log('1. Clearing user_registrations...');
  const { error: regErr, count: regCount } = await supabase
    .from('user_registrations')
    .delete()
    .neq('user_id', 'KEEP_NONE_MATCH')  // delete all rows
    .select('*', { count: 'exact', head: true });
  
  if (regErr) {
    console.log('   Error:', regErr.message);
    // Try alternative: delete where email contains @gmail.com
    const { error: regErr2 } = await supabase
      .from('user_registrations')
      .delete()
      .like('email', '%@gmail.com');
    if (regErr2) console.log('   Alt error:', regErr2.message);
    else console.log('   Cleared gmail registrations');
  } else {
    console.log('   Cleared user_registrations');
  }

  // 2. Delete all profiles (old Google/Supabase auth profiles)
  console.log('2. Clearing profiles...');
  const { error: profErr } = await supabase
    .from('profiles')
    .delete()
    .neq('id', 'KEEP_NONE_MATCH');
  
  if (profErr) {
    console.log('   Error:', profErr.message);
    // Try with a filter
    const { error: profErr2 } = await supabase
      .from('profiles')
      .delete()
      .not('id', 'is', null);
    if (profErr2) console.log('   Alt error:', profErr2.message);
    else console.log('   Cleared profiles');
  } else {
    console.log('   Cleared profiles');
  }

  // 3. Delete old task_submissions from Google users
  console.log('3. Clearing old task_submissions...');
  const { error: taskErr } = await supabase
    .from('task_submissions')
    .delete()
    .neq('task_id', 'KEEP_NONE_MATCH');
  
  if (taskErr) {
    console.log('   Error:', taskErr.message);
  } else {
    console.log('   Cleared task_submissions');
  }

  // 4. Delete old event_registrations
  console.log('4. Clearing old event_registrations...');
  const { error: evtErr } = await supabase
    .from('event_registrations')
    .delete()
    .neq('id', 'KEEP_NONE_MATCH');
  
  if (evtErr) {
    console.log('   Error:', evtErr.message);
  } else {
    console.log('   Cleared event_registrations');
  }

  // 5. List Supabase Auth users and delete old Google/email users
  console.log('5. Cleaning Supabase Auth users...');
  const { data: authUsers, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  
  if (listErr) {
    console.log('   Error listing auth users:', listErr.message);
  } else if (authUsers?.users) {
    console.log(`   Found ${authUsers.users.length} auth users`);
    let deleted = 0;
    for (const user of authUsers.users) {
      // Delete all old Supabase Auth users (Google, email/password etc)
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.log(`   Failed to delete ${user.email}: ${delErr.message}`);
      } else {
        deleted++;
        console.log(`   Deleted auth user: ${user.email}`);
      }
    }
    console.log(`   Deleted ${deleted}/${authUsers.users.length} auth users`);
  }

  console.log('\n=== Cleanup complete! ===');
  console.log('Only OTP roll-number users will be stored going forward.');
}

cleanup().catch(console.error);
