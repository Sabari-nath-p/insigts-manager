import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const { id, linkId } = await params;
  return proxyToBackend(request, `/clients/${id}/links/${linkId}`, { method: 'DELETE' });
}
