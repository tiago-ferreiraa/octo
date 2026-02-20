import { NextRequest, NextResponse } from 'next/server';
import { saveShare } from '@/lib/db';
import type { ExamData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { data: ExamData; expiresIn: number };
    const { data, expiresIn } = body;

    if (!data || typeof expiresIn !== 'number' || expiresIn <= 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    saveShare(id, data, expiresAt);

    const host = request.headers.get('host') ?? 'localhost:3000';
    const protocol = host.includes('ngrok') || host.includes('localhost') ? 'https' : 'https';
    const url = `${protocol}://${host}/share/${id}`;

    return NextResponse.json({
      id,
      url,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    });
  } catch (err) {
    console.error('Share POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
