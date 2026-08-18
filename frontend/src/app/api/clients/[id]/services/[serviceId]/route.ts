import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; serviceId: string }> }) {
  const { id, serviceId } = await params;
  return proxyToBackend(request, `/clients/${id}/services/${serviceId}`, { method: 'PATCH' });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; serviceId: string }> }) {
  const { id, serviceId } = await params;
  return proxyToBackend(request, `/clients/${id}/services/${serviceId}`, { method: 'DELETE' });
}
