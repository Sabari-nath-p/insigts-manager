import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return proxyToBackend(request, `/payroll/admin/compensation/${userId}`, { method: 'POST' });
}
