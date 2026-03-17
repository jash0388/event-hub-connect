import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables for URL and keys.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
export const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const SECRET_KEY = import.meta.env.VITE_SUPABASE_SECRET_KEY || '';

// Connectivity Hack for India: use a local proxy in dev to avoid DNS blockage
// This matches the vite.config.ts proxy target
export const EFFECTIVE_SUPABASE_URL = (import.meta.env.DEV && SUPABASE_URL && !SUPABASE_URL.includes('localhost'))
  ? `${window.location.origin}/supabase-proxy`
  : SUPABASE_URL;

// --- SINGLETON CLIENT INITIALIZATION ---
// We use singletons to prevent "Multiple instances" errors that cause AbortErrors in auth.

let _supabaseInstance: any = null;
let _supabaseAdminInstance: any = null;

export const supabase = (() => {
  if (_supabaseInstance) return _supabaseInstance;

  if (!EFFECTIVE_SUPABASE_URL || !SUPABASE_ANON_KEY || !EFFECTIVE_SUPABASE_URL.startsWith('http')) {
    console.warn('[Supabase] Main client missing URL or Key.');
    // Fallback object to prevent crashes
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: new Error("Supabase is not configured. Check your .env file.") }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signOut: () => Promise.resolve({ error: null }),
      },
      from: () => ({ 
        select: () => ({ 
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            order: () => Promise.resolve({ data: [], error: null }),
          }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      } as any),
      channel: () => ({
        on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      } as any),
    } as any;
  }

  _supabaseInstance = createClient<Database>(EFFECTIVE_SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  });
  return _supabaseInstance;
})();

export const supabaseAdmin = (() => {
  if (_supabaseAdminInstance) return _supabaseAdminInstance;

  if (!EFFECTIVE_SUPABASE_URL || !SERVICE_KEY || SERVICE_KEY === 'undefined') {
    return null;
  }

  // Admin client MUST NOT persist session to avoid conflicts with the main client
  _supabaseAdminInstance = createClient<Database>(EFFECTIVE_SUPABASE_URL, SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
  return _supabaseAdminInstance;
})();

export const hasSupabaseConfig = !!_supabaseInstance;
export const hasAdminConfig = !!_supabaseAdminInstance;
