import { NextRequest } from 'next/server';
import { proxyFileDownload } from '@/lib/proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params;
  return proxyFileDownload(request, `/clients/${id}/documents/${documentId}/file`);
}
