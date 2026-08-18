import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function PATCH(request: NextRequest) {
  return proxyToBackend(request, '/payroll/admin/settings', { method: 'PATCH' });
}
