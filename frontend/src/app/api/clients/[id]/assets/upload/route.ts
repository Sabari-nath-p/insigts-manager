import { NextRequest } from 'next/server';
import { proxyFileUpload } from '@/lib/proxy';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyFileUpload(request, `/clients/${id}/assets/upload`);
}
