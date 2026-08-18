import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  const { id, contactId } = await params;
  return proxyToBackend(request, `/clients/${id}/contacts/${contactId}`, { method: 'PATCH' });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  const { id, contactId } = await params;
  return proxyToBackend(request, `/clients/${id}/contacts/${contactId}`, { method: 'DELETE' });
}
