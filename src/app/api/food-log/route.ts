import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/food-log?date=2024-01-15
export async function GET(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);

  const db = getDb();

  const entries = db.prepare(`
    SELECT
      fl.id, fl.user_id, fl.food_item_id, fl.meal_type, fl.servings,
      fl.logged_date, fl.created_at,
      fi.name as food_name, fi.brand, fi.serving_size, fi.serving_unit,
      fi.calories, fi.protein_g, fi.carbs_g, fi.fat_g, fi.fiber_g,
      fi.sugar_g, fi.sodium_mg, fi.cholesterol_mg, fi.saturated_fat_g
    FROM food_log fl
    JOIN food_items fi ON fl.food_item_id = fi.id
    WHERE fl.user_id = ? AND fl.logged_date = ?
    ORDER BY
      CASE fl.meal_type
        WHEN 'breakfast' THEN 1
        WHEN 'lunch' THEN 2
        WHEN 'dinner' THEN 3
        WHEN 'snack' THEN 4
      END,
      fl.created_at
  `).all(userId, date);

  return NextResponse.json({ success: true, data: entries });
}

// POST /api/food-log — Add a food log entry
export async function POST(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const db = getDb();

    const { food_item_id, meal_type, servings = 1, logged_date } = body;
    const user_id = userId;

    if (!food_item_id || !meal_type || !logged_date) {
      return NextResponse.json(
        { success: false, error: 'food_item_id, meal_type, and logged_date are required' },
        { status: 400 }
      );
    }

    const result = db.prepare(`
      INSERT INTO food_log (user_id, food_item_id, meal_type, servings, logged_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(user_id, food_item_id, meal_type, servings, logged_date);

    // Return the full entry with food data
    const entry = db.prepare(`
      SELECT
        fl.id, fl.user_id, fl.food_item_id, fl.meal_type, fl.servings,
        fl.logged_date, fl.created_at,
        fi.name as food_name, fi.brand, fi.serving_size, fi.serving_unit,
        fi.calories, fi.protein_g, fi.carbs_g, fi.fat_g, fi.fiber_g,
        fi.sugar_g, fi.sodium_mg, fi.cholesterol_mg, fi.saturated_fat_g
      FROM food_log fl
      JOIN food_items fi ON fl.food_item_id = fi.id
      WHERE fl.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json({ success: true, data: entry });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

// DELETE /api/food-log?id=123
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    }

    const db = getDb();
    db.prepare('DELETE FROM food_log WHERE id = ?').run(parseInt(id));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
