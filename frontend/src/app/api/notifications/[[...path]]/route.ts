import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api';
import { TOKEN_COOKIE } from '@/lib/session';

/** Forwards /api/notifications/* from the browser to the backend with the session token attached. */
async function forward(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });

  const { path = [] } = await params;
  const target = `${getApiBaseUrl()}/notifications${path.map((p) => `/${encodeURIComponent(p)}`).join('')}${request.nextUrl.search}`;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  const res = await fetch(target, {
    method: request.method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'User-Agent': request.headers.get('user-agent') ?? '' },
    body: hasBody ? await request.text() : undefined,
    cache: 'no-store',
  });
  const text = await res.text();
  return new NextResponse(text || null, { status: res.status, headers: { 'Content-Type': 'application/json' } });
}

export { forward as GET, forward as POST };
