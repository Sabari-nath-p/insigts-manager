import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from './api';
import { TOKEN_COOKIE } from './session';

/**
 * Forwards a request from a Next.js route handler to the backend API, attaching the
 * caller's JWT (read from the httpOnly cookie, never exposed to client JS) as a Bearer
 * token. Used by every authenticated mutation the browser triggers, since the token
 * itself is not readable from client-side code.
 */
export async function proxyToBackend(
  request: NextRequest,
  path: string,
  options: { method: string },
): Promise<NextResponse> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const hasBody = options.method !== 'GET' && options.method !== 'DELETE';
  const body = hasBody ? await request.text() : undefined;

  const backendRes = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
    cache: 'no-store',
  });

  const text = await backendRes.text();
  return new NextResponse(text, {
    status: backendRes.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
