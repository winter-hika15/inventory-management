import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// プレースホルダーのままであるかを確認
export const isSupabaseConfigured = (): boolean => {
  return !!(
    supabaseUrl &&
    !supabaseUrl.includes('your-supabase-project') &&
    supabaseAnonKey &&
    supabaseAnonKey !== 'your-supabase-anon-key'
  );
};

export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-key'
);
