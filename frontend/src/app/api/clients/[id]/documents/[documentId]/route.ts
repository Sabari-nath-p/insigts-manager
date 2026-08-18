import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params;
  return proxyToBackend(request, `/clients/${id}/documents/${documentId}`, { method: 'DELETE' });
}
