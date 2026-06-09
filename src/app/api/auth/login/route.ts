/**
 * POST /api/auth/login
 * サーバーサイドのログイン処理
 * 
 * パスワードの検証はサーバーサイドで行い、クライアントにはパスワードを一切返さない
 */

import { NextRequest } from 'next/server';
import { createSessionToken, getSessionCookieName, getSessionMaxAge } from '@/lib/auth';
import { getSupabaseServer, isServerSupabaseConfigured } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: 'メールアドレスとパスワードを入力してください' },
        { status: 400 }
      );
    }

    // テスト用アカウント（admin@example.com等）の場合はローカルモードとして処理
    const isTestAccount = ['admin@example.com', 'shopA@example.com', 'shopB@example.com'].includes(email);
    if (isTestAccount || !isServerSupabaseConfigured()) {
      return handleLocalLogin(email, password);
    }

    const supabase = getSupabaseServer();

    // まず authenticate_shop RPC関数を試す（パスワードがハッシュ化されている場合）
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('authenticate_shop', {
          p_email: email,
          p_password: password,
        });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const shop = rpcData[0];
        return await createLoginResponse(shop);
      }
    } catch {
      // RPC関数が存在しない場合（マイグレーション未実行）、フォールバック
    }

    // フォールバック: 平文パスワードとの比較（マイグレーション前の互換性）
    const { data: shops, error } = await supabase
      .from('shops')
      .select('id, name, email, role, password')
      .eq('email', email);

    if (error) {
      console.error('ログインクエリ失敗:', error.message);
      return Response.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!shops || shops.length === 0) {
      return Response.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    const shop = shops[0];

    // 平文パスワードの比較（マイグレーション前の互換性のためのフォールバック）
    if (shop.password !== password) {
      return Response.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    return await createLoginResponse(shop);

  } catch (err: unknown) {
    console.error('ログインエラー:', err);
    return Response.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * ログイン成功レスポンスを生成する
 * セッションCookieを発行し、ユーザー情報を返す
 */
async function createLoginResponse(shop: { id: string; name: string; email: string; role: string }) {
  const token = await createSessionToken({
    shopId: shop.id,
    email: shop.email,
    role: shop.role as 'admin' | 'store',
    name: shop.name,
  });

  const response = Response.json({
    success: true,
    user: {
      id: shop.id,
      name: shop.name,
      email: shop.email,
      role: shop.role,
    },
  });

  // セキュアな HTTP-Only Cookie を設定
  response.headers.set(
    'Set-Cookie',
    `${getSessionCookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${getSessionMaxAge()}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );

  return response;
}

/**
 * ローカルモードでのログイン処理
 * Supabase未設定時に使用
 */
async function handleLocalLogin(email: string, password: string) {
  // ローカルモード用のデフォルトアカウント
  const localAccounts = [
    { id: 'admin-id', name: '本部管理者', email: 'admin@example.com', password: 'admin123', role: 'admin' },
    { id: 'shopA-id', name: '店舗A', email: 'shopA@example.com', password: 'shopA123', role: 'store' },
    { id: 'shopB-id', name: '店舗B', email: 'shopB@example.com', password: 'shopB123', role: 'store' },
  ];

  const matched = localAccounts.find(
    (acc) => acc.email === email && acc.password === password
  );

  if (!matched) {
    return Response.json(
      { error: 'メールアドレスまたはパスワードが正しくありません' },
      { status: 401 }
    );
  }

  return await createLoginResponse(matched);
}
