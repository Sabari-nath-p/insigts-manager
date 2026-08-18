import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; meetingId: string }> }) {
  const { id, meetingId } = await params;
  return proxyToBackend(request, `/clients/${id}/meetings/${meetingId}`, { method: 'PATCH' });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; meetingId: string }> }) {
  const { id, meetingId } = await params;
  return proxyToBackend(request, `/clients/${id}/meetings/${meetingId}`, { method: 'DELETE' });
}
