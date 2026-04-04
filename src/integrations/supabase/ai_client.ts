import { createClient } from '@supabase/supabase-js';

export const AI_SUPABASE_URL = import.meta.env.VITE_AI_SUPABASE_URL || '';
export const AI_SUPABASE_ANON_KEY = import.meta.env.VITE_AI_SUPABASE_ANON_KEY || '';

export const aiSupabase = createClient(AI_SUPABASE_URL, AI_SUPABASE_ANON_KEY);
