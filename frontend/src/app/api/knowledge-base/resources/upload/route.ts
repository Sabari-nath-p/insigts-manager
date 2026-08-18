import { NextRequest } from 'next/server';
import { proxyFileUpload } from '@/lib/proxy';

export async function POST(request: NextRequest) {
  return proxyFileUpload(request, '/knowledge-base/resources/upload');
}
