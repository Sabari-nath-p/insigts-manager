import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = await params;
  return proxyToBackend(request, `/clients/${id}/team/${memberId}`, { method: 'PATCH' });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = await params;
  return proxyToBackend(request, `/clients/${id}/team/${memberId}`, { method: 'DELETE' });
}
