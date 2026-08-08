import { NextResponse } from 'next/server';

const TOKEN_COOKIE = 'insights_token';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}
