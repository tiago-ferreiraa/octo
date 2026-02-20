import { NextRequest, NextResponse } from 'next/server';
import { getShareWithExpiry } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = getShareWithExpiry(id);

  if (!result) {
    return NextResponse.json({ error: 'Not found or expired' }, { status: 404 });
  }

  return NextResponse.json({ data: result.data, expiresAt: result.expiresAt });
}
