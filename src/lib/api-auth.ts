import { NextRequest } from 'next/server';
import { verifySessionToken, getSessionCookieName, SessionPayload } from './auth';

export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const cookieHeader = request.cookies.get(getSessionCookieName());
  if (!cookieHeader || !cookieHeader.value) return null;
  return await verifySessionToken(cookieHeader.value);
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse() {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
