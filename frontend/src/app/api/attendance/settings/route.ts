import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function PATCH(request: NextRequest) {
  return proxyToBackend(request, '/attendance/settings', { method: 'PATCH' });
}
