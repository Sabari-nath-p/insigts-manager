import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; assetId: string }> }) {
  const { id, assetId } = await params;
  return proxyToBackend(request, `/clients/${id}/assets/${assetId}`, { method: 'DELETE' });
}
