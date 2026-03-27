const { createClient } = require('./node_modules/@supabase/supabase-js');
require('./node_modules/dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const MISSING_UIDS = [
  'SplJv5td8YMn0uZhEVnZ1WSQfQI3',
  'ymRsEThDPNRSRkbXfToHGayIyzq1', 
  'gRmQqNIwt9f9qUW6LLMD3xbX7R02',
  'h2OxH58ez0O4FMyM32ZfE2OzjXm1',
  'bFXqYwe10cM39Oa7eeJs1wT7J292',
  'YWU3u91L6nfqCkecJiulw8ww3wa2',
  'bnaH91WHc3PKNPLVzYeY9TNLCyp2',
  'cPKliPl2zXPrtwpvLnszl3DBz3o1'
];

async function run() {
  const { data: userRegs } = await supabase.from('user_registrations').select('*');
  
  console.log("=== ALL USER REGISTRATIONS (via service role) ===");
  (userRegs || []).forEach(r => {
    console.log(`  user_id="${r.user_id}" | name="${r.full_name}" | email="${r.email}"`);
  });

  console.log("\n=== MATCHING FIREBASE UIDs ===");
  for (const uid of MISSING_UIDS) {
    const match = userRegs?.find(r => r.user_id === uid);
    if (match) {
      console.log(`  FOUND: ${uid.slice(0,12)}... => "${match.full_name}" (${match.email})`);
      
      // Update task_submissions
      const { error } = await supabase.from('task_submissions')
        .update({ user_display_name: match.full_name })
        .eq('user_id', uid);
      console.log(error ? `    ERROR: ${error.message}` : `    -> Updated in DB!`);
    } else {
      console.log(`  NOT FOUND: ${uid.slice(0,12)}...`);
    }
  }

  // Final state
  console.log("\n=== FINAL LEADERBOARD ===");
  const { data: subs } = await supabase.from('task_submissions').select('user_id, user_display_name, points_awarded, status');
  const lb = {};
  (subs || []).forEach(s => {
    if (s.status === 'approved') {
      if (!lb[s.user_id]) lb[s.user_id] = { name: s.user_display_name, pts: 0 };
      lb[s.user_id].pts += s.points_awarded || 0;
    }
  });
  Object.entries(lb).sort((a, b) => b[1].pts - a[1].pts).forEach(([uid, info]) => {
    console.log(`  ${info.name || 'STILL MISSING'} => ${info.pts} XP`);
  });
}

run().catch(console.error);
