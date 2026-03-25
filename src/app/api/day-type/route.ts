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

  // Check for manual override first
  const row = db.prepare('SELECT day_type FROM day_types WHERE user_id = ? AND date = ?').get(userId, date) as { day_type: string } | undefined;

  if (row) {
    return NextResponse.json({ success: true, data: { date, day_type: row.day_type, source: 'manual' } });
  }

  // No manual override — auto-suggest from workout schedule
  const user = db.prepare('SELECT workout_schedule FROM users WHERE id = ?').get(userId) as { workout_schedule: string } | undefined;
  const schedule = (user?.workout_schedule ?? '0,2,4,6').split(',').map(Number);

  // JavaScript getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  // Our schedule: 0=Monday, 1=Tuesday, ..., 6=Sunday
  // Convert: JS Sunday(0) → our 6, JS Monday(1) → our 0, etc.
  const jsDay = new Date(date + 'T12:00:00').getDay(); // noon to avoid timezone edge cases
  const ourDay = jsDay === 0 ? 6 : jsDay - 1; // convert to Mon=0 format

  const isWorkoutDay = schedule.includes(ourDay);

  return NextResponse.json({
    success: true,
    data: { date, day_type: isWorkoutDay ? 'training' : 'rest', source: 'schedule' },
  });
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

  return NextResponse.json({ success: true, data: { date, day_type, source: 'manual' } });
}
