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
  // The Response constructor forbids a body on 204/205/304 statuses — even an empty string
  // counts as "a body", so a bodyless backend response (e.g. DELETE -> 204) must pass null.
  return new NextResponse(text || null, {
    status: backendRes.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Like proxyToBackend, but for multipart/form-data file uploads — reads the request
 * body as raw bytes (never .text(), which would corrupt binary file content inside the
 * multipart body) and forwards the original Content-Type header so the multipart
 * boundary survives the hop.
 */
export async function proxyFileUpload(request: NextRequest, path: string): Promise<NextResponse> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.arrayBuffer();
  const contentType = request.headers.get('content-type');

  const backendRes = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(contentType ? { 'Content-Type': contentType } : {}),
    },
    body,
    cache: 'no-store',
  });

  const text = await backendRes.text();
  return new NextResponse(text || null, {
    status: backendRes.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Streams a binary file response (e.g. a PDF) straight from the backend to the browser,
 * preserving Content-Type/Content-Disposition instead of proxyToBackend's JSON-only
 * response handling. This is what lets a plain <a href>/<iframe src> pointed at this
 * route authenticate via the httpOnly session cookie, the same way every other
 * authenticated request in this app does — the browser never sees the Bearer token.
 */
export async function proxyFileDownload(request: NextRequest, path: string): Promise<NextResponse> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const backendRes = await fetch(`${getApiBaseUrl()}${path}${request.nextUrl.search}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!backendRes.ok) {
    const text = await backendRes.text();
    return new NextResponse(text || null, {
      status: backendRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const buffer = await backendRes.arrayBuffer();
  const headers = new Headers();
  const contentType = backendRes.headers.get('content-type');
  const contentDisposition = backendRes.headers.get('content-disposition');
  if (contentType) headers.set('Content-Type', contentType);
  if (contentDisposition) headers.set('Content-Disposition', contentDisposition);
  return new NextResponse(buffer, { status: backendRes.status, headers });
}
