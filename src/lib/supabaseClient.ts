import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isPlaceholderUrl =
  !rawUrl ||
  rawUrl.includes('your-project-ref') ||
  (!rawUrl.startsWith('https://') && !rawUrl.startsWith('http://'));

const isPlaceholderKey =
  !rawAnonKey || rawAnonKey.includes('your-supabase-anon-public-key');

export const isSupabaseConfigured = !isPlaceholderUrl && !isPlaceholderKey;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
