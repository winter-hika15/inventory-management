/**
 * サーバーサイド専用の Supabase クライアント
 * service_role キーを使用（RLSをバイパス可能）
 * 
 * ⚠️ このクライアントは API Routes (Route Handlers) 内でのみ使用すること
 * クライアントサイドコンポーネントでは絶対に使用しないこと
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseServerInstance: SupabaseClient | null = null;

/**
 * サーバーサイド用Supabaseクライアントを取得する
 * service_role キーが利用できない場合は anon キーにフォールバック
 */
export function getSupabaseServer(): SupabaseClient {
  if (supabaseServerInstance) return supabaseServerInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // service_role キーが利用可能であればそれを使用（RLSバイパス可能）
  const key = serviceRoleKey || anonKey;

  if (!supabaseUrl || !key) {
    throw new Error('Supabase の接続情報が設定されていません');
  }

  supabaseServerInstance = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseServerInstance;
}

/**
 * service_role キーが設定されているか確認する
 */
export function hasServiceRoleKey(): boolean {
  return !!(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Supabase のサーバーサイドが利用可能かどうか
 */
export function isServerSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return !!(
    url &&
    !url.includes('your-supabase-project') &&
    key &&
    key !== 'your-supabase-anon-key' &&
    key !== 'placeholder-key'
  );
}
