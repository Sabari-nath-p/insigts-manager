import { NextRequest } from 'next/server';
import { proxyFileUpload, proxyFileDownload } from '@/lib/proxy';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyFileUpload(request, `/clients/${id}/logo`);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyFileDownload(request, `/clients/${id}/logo`);
}
