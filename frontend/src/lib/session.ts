import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const TOKEN_COOKIE = 'insights_token';

export interface SessionUser {
  userId: string;
  email: string;
  role: 'super_admin' | 'manager' | 'employee';
}

/**
 * Decodes the JWT payload without verifying the signature. This is only used to drive
 * UI decisions (which nav links / pages to show); the backend independently verifies
 * every request's Authorization header, so a tampered token simply gets 401/403 there.
 */
function decodeJwt(token: string): SessionUser | null {
  try {
    const payload = token.split('.')[1];
    const json = Buffer.from(payload, 'base64').toString('utf-8');
    const decoded = JSON.parse(json);
    return { userId: decoded.sub, email: decoded.email, role: decoded.role };
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return decodeJwt(token);
}

/** Redirects to /login if there is no session; otherwise returns the token + user. */
export async function requireSession(): Promise<{ token: string; user: SessionUser }> {
  const token = await getSessionToken();
  const user = token ? decodeJwt(token) : null;
  if (!token || !user) {
    redirect('/login');
  }
  return { token, user };
}

/** Redirects to /dashboard if the current user is not a super admin. */
export async function requireSuperAdmin(): Promise<{ token: string; user: SessionUser }> {
  const session = await requireSession();
  if (session.user.role !== 'super_admin') {
    redirect('/dashboard');
  }
  return session;
}

/** Redirects to /dashboard if the current user can't review team work logs (manager or super admin). */
export async function requireReviewer(): Promise<{ token: string; user: SessionUser }> {
  const session = await requireSession();
  if (session.user.role !== 'super_admin' && session.user.role !== 'manager') {
    redirect('/dashboard');
  }
  return session;
}
