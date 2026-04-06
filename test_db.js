import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: p } = await supabase.from('profiles').select('*');
  console.log("Profiles count:", p?.length);
  
  const { data: u } = await supabase.from('user_registrations').select('*');
  console.log("User Regs count:", u?.length);

  const { data: s } = await supabase.from('task_submissions').select('*');
  console.log("Submissions count:", s?.length);

  const bfxq = p?.filter(x => x.id.toLowerCase().includes('bfxq') || x.firebase_uid?.toLowerCase().includes('bfxq'));
  console.log("Profile BFXQ:", bfxq);

  const uBfxq = u?.filter(x => x.user_id?.toLowerCase().includes('bfxq') || x.id?.toLowerCase().includes('bfxq'));
  console.log("UserReg BFXQ:", uBfxq);
  
  const sBfxq = s?.filter(x => x.user_id?.toLowerCase().includes('bfxq'));
  console.log("Sub BFXQ:", sBfxq);
}
check();
