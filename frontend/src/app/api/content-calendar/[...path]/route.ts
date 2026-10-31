import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api';
import { TOKEN_COOKIE } from '@/lib/session';

/**
 * Forwards /api/content-calendar/* from the browser to the backend's /content-calendar/* with the
 * session cookie turned into a Bearer token. The target is always prefixed with /content-calendar,
 * so this can never reach another controller.
 */
async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });

  const { path } = await params;
  const target = `${getApiBaseUrl()}/content-calendar/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE';

  const res = await fetch(target, {
    method: request.method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: hasBody ? await request.text() : undefined,
    cache: 'no-store',
  });

  const body = res.status === 204 ? null : await res.arrayBuffer();
  return new NextResponse(body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' } });
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
