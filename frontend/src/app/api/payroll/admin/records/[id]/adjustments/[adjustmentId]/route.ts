import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; adjustmentId: string }> }) {
  const { id, adjustmentId } = await params;
  return proxyToBackend(request, `/payroll/admin/records/${id}/adjustments/${adjustmentId}`, { method: 'DELETE' });
}
