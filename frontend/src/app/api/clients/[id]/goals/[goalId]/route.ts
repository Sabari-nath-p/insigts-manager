import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; goalId: string }> }) {
  const { id, goalId } = await params;
  return proxyToBackend(request, `/clients/${id}/goals/${goalId}`, { method: 'PATCH' });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; goalId: string }> }) {
  const { id, goalId } = await params;
  return proxyToBackend(request, `/clients/${id}/goals/${goalId}`, { method: 'DELETE' });
}
