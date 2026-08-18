import { NextRequest } from 'next/server';
import { proxyFileDownload } from '@/lib/proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyFileDownload(request, `/knowledge-base/resources/${id}/file`);
}
