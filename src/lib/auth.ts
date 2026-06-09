/**
 * セッショントークンの生成・検証ユーティリティ
 * HMAC-SHA256 署名を使った改ざん不可能なセッション管理
 */

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-fallback-secret-change-in-production';
const SESSION_COOKIE_NAME = 'inv_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7日間（秒）

export interface SessionPayload {
  shopId: string;
  email: string;
  role: 'admin' | 'store';
  name: string;
  iat: number; // issued at (Unix timestamp)
  exp: number; // expiry (Unix timestamp)
}

/**
 * HMAC-SHA256署名を生成する
 */
async function createSignature(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * セッショントークンを生成する
 */
export async function createSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_MAX_AGE,
  };

  const payloadStr = btoa(encodeURIComponent(JSON.stringify(fullPayload)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const signature = await createSignature(payloadStr);
  return `${payloadStr}.${signature}`;
}

/**
 * セッショントークンを検証し、ペイロードを返す
 * 無効な場合はnullを返す
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadStr, providedSignature] = parts;

    // 署名の検証
    const expectedSignature = await createSignature(payloadStr);
    if (providedSignature !== expectedSignature) {
      return null; // 署名の不一致 → 改ざんされたトークン
    }

    // ペイロードの復元
    const paddedPayload = payloadStr.replace(/-/g, '+').replace(/_/g, '/');
    const decodedStr = decodeURIComponent(atob(paddedPayload));
    const decoded = JSON.parse(decodedStr) as SessionPayload;

    // 有効期限の確認
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return null; // 有効期限切れ
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * セッションCookie名を取得する
 */
export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

/**
 * セッションCookieの最大有効期間（秒）を取得する
 */
export function getSessionMaxAge(): number {
  return SESSION_MAX_AGE;
}
