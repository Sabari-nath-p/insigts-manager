import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { id, noteId } = await params;
  return proxyToBackend(request, `/clients/${id}/notes/${noteId}`, { method: 'PATCH' });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { id, noteId } = await params;
  return proxyToBackend(request, `/clients/${id}/notes/${noteId}`, { method: 'DELETE' });
}
