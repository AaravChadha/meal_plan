import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/weight?user_id=1&limit=30
export async function GET(request: NextRequest) {
  const userId = parseInt(request.nextUrl.searchParams.get('user_id') || '1');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '30');

  const db = getDb();
  const entries = db.prepare(`
    SELECT * FROM weight_log
    WHERE user_id = ?
    ORDER BY logged_date DESC
    LIMIT ?
  `).all(userId, limit);

  return NextResponse.json({ success: true, data: entries });
}

// POST /api/weight — Log a weight entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getDb();

    const { user_id = 1, weight_kg, logged_date } = body;

    if (!weight_kg || !logged_date) {
      return NextResponse.json(
        { success: false, error: 'weight_kg and logged_date are required' },
        { status: 400 }
      );
    }

    // Upsert — update if same date exists, insert otherwise
    const existing = db.prepare(
      'SELECT id FROM weight_log WHERE user_id = ? AND logged_date = ?'
    ).get(user_id, logged_date) as { id: number } | undefined;

    if (existing) {
      db.prepare('UPDATE weight_log SET weight_kg = ? WHERE id = ?').run(weight_kg, existing.id);
    } else {
      db.prepare('INSERT INTO weight_log (user_id, weight_kg, logged_date) VALUES (?, ?, ?)').run(
        user_id, weight_kg, logged_date
      );
    }

    // Also update user's current weight
    db.prepare('UPDATE users SET weight_kg = ?, updated_at = datetime(\'now\') WHERE id = ?').run(weight_kg, user_id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
