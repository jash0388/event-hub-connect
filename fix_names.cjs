const { createClient } = require('./node_modules/@supabase/supabase-js');
require('./node_modules/dotenv').config();

// Use SERVICE ROLE key to bypass RLS completely
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function fixNames() {
  // Step 1: Get all unique user_ids from task_submissions that DON'T have a display name yet
  const { data: subs } = await supabase.from('task_submissions').select('user_id, user_display_name');
  
  const missingNameIds = [...new Set((subs || []).filter(s => !s.user_display_name).map(s => s.user_id))];
  console.log("Users missing display names:", missingNameIds);

  if (missingNameIds.length === 0) {
    console.log("All users already have names! Nothing to fix.");
    return;
  }

  // Step 2: Try to find names from profiles table  
  const { data: profiles } = await supabase.from('profiles').select('*');
  
  // Step 3: Use Supabase Auth Admin to look up Firebase users by their UID
  // Service role key grants admin auth access
  for (const uid of missingNameIds) {
    let displayName = null;

    // Check profiles first
    const prof = profiles?.find(p => p.id === uid || p.firebase_uid === uid);
    if (prof?.full_name && prof.full_name !== 'null') {
      displayName = prof.full_name;
    }

    // If not in profiles, try Supabase Auth admin lookup
    if (!displayName) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(uid);
        if (authUser?.user) {
          displayName = authUser.user.user_metadata?.full_name || 
                       authUser.user.user_metadata?.name ||
                       authUser.user.email?.split('@')[0];
        }
      } catch (e) {
        // Not a Supabase auth user, probably Firebase-only
      }
    }

    // If still no name, try listing all auth users and matching by email patterns
    if (!displayName) {
      // For Firebase UIDs, we can't look up via Supabase Auth. 
      // Let's check event_registrations as last resort
      const { data: eventRegs } = await supabase.from('event_registrations').select('full_name, email, user_id');
      const eventMatch = eventRegs?.find(e => e.user_id === uid);
      if (eventMatch?.full_name) {
        displayName = eventMatch.full_name;
      }
    }

    if (displayName) {
      console.log(`Updating ${uid.slice(0,12)}... => "${displayName}"`);
      await supabase.from('task_submissions')
        .update({ user_display_name: displayName })
        .eq('user_id', uid);
    } else {
      console.log(`Could NOT find name for ${uid} - will need manual input`);
    }
  }

  // Step 4: Final verification
  const { data: finalSubs } = await supabase.from('task_submissions').select('user_id, user_display_name, status');
  const lbMap = {};
  (finalSubs || []).forEach(s => {
    if (s.status === 'approved') {
      lbMap[s.user_id] = { name: s.user_display_name || 'STILL MISSING', pts: (lbMap[s.user_id]?.pts || 0) + 1 };
    }
  });
  console.log("\n=== FINAL LEADERBOARD STATE ===");
  Object.entries(lbMap).forEach(([uid, info]) => {
    console.log(`  ${uid.slice(0,12)}... => name: "${info.name}"`);
  });
}

fixNames().catch(console.error);
