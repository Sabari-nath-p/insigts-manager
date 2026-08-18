import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/attendance/holidays/duplicate', { method: 'POST' });
}
