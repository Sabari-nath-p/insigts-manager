import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api';
import { TOKEN_COOKIE } from '@/lib/session';

export async function GET(request: NextRequest) {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const query = request.nextUrl.search;
  const backendRes = await fetch(`${getApiBaseUrl()}/attendance/holidays/export${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const body = await backendRes.text();
  return new NextResponse(body, {
    status: backendRes.status,
    headers: {
      'Content-Type': backendRes.headers.get('Content-Type') || 'text/csv',
      'Content-Disposition': backendRes.headers.get('Content-Disposition') || 'attachment; filename="holiday-calendar.csv"',
    },
  });
}
