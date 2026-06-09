/**
 * POST /api/auth/logout
 * セッションCookieを無効化してログアウト
 */

import { getSessionCookieName } from '@/lib/auth';

export async function POST() {
  const response = Response.json({ success: true });

  // セッションCookieを削除（Max-Age=0で即時期限切れにする）
  response.headers.set(
    'Set-Cookie',
    `${getSessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );

  return response;
}
