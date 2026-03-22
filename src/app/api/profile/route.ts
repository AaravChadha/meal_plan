import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/profile
export async function GET(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  // Remove password hash from response
  const { password_hash: _, ...safeUser } = user as Record<string, unknown>;
  return NextResponse.json({ success: true, data: safeUser });
}

// PUT /api/profile — Update user profile or targets
export async function PUT(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const db = getDb();

    // Build dynamic update
    const allowedFields = [
      'name', 'age', 'weight_kg', 'height_cm', 'activity_level', 'goal',
      'gender', 'body_fat_pct',
      'target_calories', 'target_protein_g', 'target_carbs_g', 'target_fat_g',
      'target_fiber_g', 'target_sodium_mg',
    ];

    const updates: string[] = [];
    const values: (string | number)[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    values.push(userId);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const { password_hash: _, ...safeUser } = user as Record<string, unknown>;

    return NextResponse.json({ success: true, data: safeUser });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
