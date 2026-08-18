import { NextRequest } from 'next/server';
import { proxyFileDownload } from '@/lib/proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; assetId: string }> }) {
  const { id, assetId } = await params;
  return proxyFileDownload(request, `/clients/${id}/assets/${assetId}/file`);
}
