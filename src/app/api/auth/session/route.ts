/**
 * GET /api/auth/session
 * 現在のセッション状態を返す
 * 
 * セッションCookieを検証し、有効なセッションの場合はユーザー情報を返す
 */

import { NextRequest } from 'next/server';
import { verifySessionToken, getSessionCookieName } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.cookies.get(getSessionCookieName());

    if (!cookieHeader || !cookieHeader.value) {
      return Response.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    const payload = await verifySessionToken(cookieHeader.value);

    if (!payload) {
      // トークンが無効または期限切れ
      const response = Response.json(
        { authenticated: false, user: null },
        { status: 200 }
      );

      // 無効なCookieを削除
      response.headers.set(
        'Set-Cookie',
        `${getSessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
      );

      return response;
    }

    return Response.json({
      authenticated: true,
      user: {
        id: payload.shopId,
        email: payload.email,
        role: payload.role,
        name: payload.name,
      },
    });
  } catch (err: unknown) {
    console.error('セッション検証エラー:', err);
    return Response.json(
      { authenticated: false, user: null },
      { status: 200 }
    );
  }
}
