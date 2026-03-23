import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/day-type?date=2026-03-22
export async function GET(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ success: false, error: 'date is required' }, { status: 400 });
  }

  const db = getDb();
  const row = db.prepare('SELECT day_type FROM day_types WHERE user_id = ? AND date = ?').get(userId, date) as { day_type: string } | undefined;

  return NextResponse.json({ success: true, data: { date, day_type: row?.day_type ?? 'training' } });
}

// PUT /api/day-type  { date, day_type }
export async function PUT(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { date, day_type } = await request.json();
  if (!date || !['rest', 'training'].includes(day_type)) {
    return NextResponse.json({ success: false, error: 'Invalid date or day_type' }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO day_types (user_id, date, day_type) VALUES (?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET day_type = excluded.day_type`
  ).run(userId, date, day_type);

  return NextResponse.json({ success: true, data: { date, day_type } });
}
