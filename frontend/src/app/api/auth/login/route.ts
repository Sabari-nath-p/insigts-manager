import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api';

const TOKEN_COOKIE = 'insights_token';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const backendRes = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await backendRes.json().catch(() => null);

  if (!backendRes.ok) {
    return NextResponse.json(
      { message: data?.message || 'Login failed' },
      { status: backendRes.status },
    );
  }

  const response = NextResponse.json({ user: data.user });
  response.cookies.set(TOKEN_COOKIE, data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    // Base this on the actual connection, not NODE_ENV: the container always runs with
    // NODE_ENV=production, but is commonly accessed over plain http (e.g. localhost in
    // Docker). A `Secure` cookie set over http is silently dropped by most browsers
    // (Chrome's "localhost" exception aside), which made login appear to succeed while
    // the session cookie never actually persisted.
    secure: isHttps(request),
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });
  return response;
}

function isHttps(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) return forwardedProto === 'https';
  return request.nextUrl.protocol === 'https:';
}
