import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/foods/favorites — get user's favorite foods
export async function GET(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const db = getDb();
  const favorites = db.prepare(`
    SELECT fi.id, fi.name, fi.brand, fi.category, fi.serving_size, fi.serving_unit,
           fi.calories, fi.protein_g, fi.carbs_g, fi.fat_g, fi.fiber_g,
           fi.sugar_g, fi.sodium_mg, fi.cholesterol_mg, fi.saturated_fat_g,
           fi.fdc_id, fi.is_custom
    FROM favorite_foods ff
    JOIN food_items fi ON fi.id = ff.food_item_id
    WHERE ff.user_id = ?
    ORDER BY fi.name
  `).all(userId);

  return NextResponse.json({ success: true, data: favorites });
}

// POST /api/foods/favorites — add a favorite
export async function POST(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const { food_item_id } = await request.json();
  if (!food_item_id) return NextResponse.json({ success: false, error: 'food_item_id required' }, { status: 400 });

  const db = getDb();
  try {
    db.prepare('INSERT OR IGNORE INTO favorite_foods (user_id, food_item_id) VALUES (?, ?)').run(userId, food_item_id);
  } catch {
    // Already favorited — ignore
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/foods/favorites?food_item_id=123 — remove a favorite
export async function DELETE(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const foodItemId = request.nextUrl.searchParams.get('food_item_id');
  if (!foodItemId) return NextResponse.json({ success: false, error: 'food_item_id required' }, { status: 400 });

  const db = getDb();
  db.prepare('DELETE FROM favorite_foods WHERE user_id = ? AND food_item_id = ?').run(userId, parseInt(foodItemId));

  return NextResponse.json({ success: true });
}
