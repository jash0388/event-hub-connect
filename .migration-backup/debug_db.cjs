const { createClient } = require('./node_modules/@supabase/supabase-js');
require('./node_modules/dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function debug() {
  // 1. Get all submissions with approved status to see who's on the leaderboard
  const { data: subs } = await supabase.from('task_submissions').select('user_id, points_awarded, status');
  const lbMap = {};
  (subs || []).forEach(s => {
    if (s.status === 'approved') lbMap[s.user_id] = (lbMap[s.user_id] || 0) + (s.points_awarded || 0);
  });
  
  console.log("\n=== LEADERBOARD USER IDs ===");
  const sorted = Object.entries(lbMap).sort((a, b) => b[1] - a[1]);
  for (const [uid, pts] of sorted) {
    console.log(`  ${uid} => ${pts} XP`);
  }

  // 2. Check each ID against profiles
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log("\n=== PROFILES TABLE ===");
  console.log(`  Total rows: ${profiles?.length}`);
  for (const [uid] of sorted) {
    const match = profiles?.find(p => p.id === uid || p.firebase_uid === uid);
    console.log(`  ${uid.slice(0,12)}... => profile match: ${match ? `YES (full_name="${match.full_name}", email="${match.email}", firebase_uid="${match.firebase_uid}")` : 'NO MATCH'}`);
  }

  // 3. Check each ID against user_registrations
  const { data: userRegs } = await supabase.from('user_registrations').select('*');
  console.log("\n=== USER_REGISTRATIONS TABLE ===");
  console.log(`  Total rows: ${userRegs?.length}`);
  for (const [uid] of sorted) {
    const match = userRegs?.find(r => r.user_id === uid);
    console.log(`  ${uid.slice(0,12)}... => reg match: ${match ? `YES (full_name="${match.full_name}", email="${match.email}")` : 'NO MATCH'}`);
  }

  // 4. Check event_registrations
  const { data: eventRegs } = await supabase.from('event_registrations').select('full_name, email');
  console.log("\n=== EVENT_REGISTRATIONS TABLE ===");
  console.log(`  Total rows: ${eventRegs?.length}`);
  
  // 5. Show ALL profiles for reference
  console.log("\n=== ALL PROFILES DUMP ===");
  (profiles || []).forEach(p => {
    console.log(`  id=${p.id?.slice(0,12)}... | firebase_uid=${p.firebase_uid || 'NULL'} | full_name="${p.full_name}" | email="${p.email}"`);
  });

  // 6. Show ALL user_registrations
  console.log("\n=== ALL USER_REGISTRATIONS DUMP ===");
  (userRegs || []).forEach(r => {
    console.log(`  user_id=${r.user_id?.slice(0,12)}... | full_name="${r.full_name}" | email="${r.email}"`);
  });
}

debug().catch(console.error);
