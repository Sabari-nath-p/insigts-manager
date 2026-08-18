import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ leaveType: string }> }) {
  const { leaveType } = await params;
  return proxyToBackend(request, `/payroll/admin/leave-rules/${leaveType}`, { method: 'PATCH' });
}
