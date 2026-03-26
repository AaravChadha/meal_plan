import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { searchUSDA, searchOpenFoodFacts, ParsedFood } from '@/lib/usda';

// GET /api/foods?q=chicken&source=all
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || '';
  const source = request.nextUrl.searchParams.get('source') || 'all';
  const userId = getSessionUser(request);

  if (!q || q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  const db = getDb();
  let results: Record<string, unknown>[] = [];

  // Search local database — show shared foods (user_id IS NULL) + user's own custom foods
  if (source === 'all' || source === 'local') {
    const localResults = db.prepare(`
      SELECT * FROM food_items
      WHERE (name LIKE ? OR brand LIKE ? OR category LIKE ?)
        AND (user_id IS NULL OR user_id = ?)
      ORDER BY
        CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
        name
      LIMIT 15
    `).all(`%${q}%`, `%${q}%`, `%${q}%`, userId ?? -1, `${q}%`) as Record<string, unknown>[];

    results = localResults.map((r) => ({ ...r, source: 'local' }));
  }

  // Search external APIs in parallel if local results are sparse
  if ((source === 'all' || source === 'usda') && results.length < 10) {
    const [usdaResults, offResults] = await Promise.all([
      searchUSDA(q, 5).catch(() => [] as ParsedFood[]),
      searchOpenFoodFacts(q, 5).catch(() => [] as ParsedFood[]),
    ]);

    const mapExternal = (foods: ParsedFood[], src: string) =>
      foods.map((f) => ({ id: null, ...f, is_custom: 0, source: src }));

    results = [...results, ...mapExternal(usdaResults, 'usda'), ...mapExternal(offResults, 'openfoodfacts')];
  }

  return NextResponse.json({ success: true, data: results });
}

// POST /api/foods — Add a custom food or save a USDA/OFF food locally
export async function POST(request: NextRequest) {
  try {
    const userId = getSessionUser(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const db = getDb();

    // If it has an fdc_id, check if already saved
    if (body.fdc_id) {
      const existing = db.prepare('SELECT id FROM food_items WHERE fdc_id = ?').get(body.fdc_id) as { id: number } | undefined;
      if (existing) {
        return NextResponse.json({ success: true, data: { id: existing.id } });
      }
    }

    // Custom foods (is_custom=1) are tied to the user. External foods (USDA/OFF) are shared (user_id=NULL).
    const isCustom = body.is_custom ?? 1;
    const foodUserId = isCustom ? userId : null;

    const result = db.prepare(`
      INSERT INTO food_items (name, brand, category, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, cholesterol_mg, saturated_fat_g, fdc_id, is_custom, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.name,
      body.brand || null,
      body.category || null,
      body.serving_size || 100,
      body.serving_unit || 'g',
      body.calories || 0,
      body.protein_g || 0,
      body.carbs_g || 0,
      body.fat_g || 0,
      body.fiber_g || 0,
      body.sugar_g || 0,
      body.sodium_mg || 0,
      body.cholesterol_mg || 0,
      body.saturated_fat_g || 0,
      body.fdc_id || null,
      isCustom,
      foodUserId,
    );

    return NextResponse.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

// PUT /api/foods — Edit a custom food (only your own)
export async function PUT(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  const db = getDb();

  // Only allow editing your own custom foods
  const existing = db.prepare('SELECT id FROM food_items WHERE id = ? AND is_custom = 1 AND user_id = ?').get(body.id, userId);
  if (!existing) return NextResponse.json({ success: false, error: 'Food not found or not yours' }, { status: 403 });

  db.prepare(`
    UPDATE food_items SET name = ?, brand = ?, serving_size = ?, serving_unit = ?,
      calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, fiber_g = ?,
      sugar_g = ?, sodium_mg = ?, cholesterol_mg = ?, saturated_fat_g = ?
    WHERE id = ? AND user_id = ?
  `).run(
    body.name, body.brand || null, body.serving_size || 100, body.serving_unit || 'g',
    body.calories || 0, body.protein_g || 0, body.carbs_g || 0, body.fat_g || 0, body.fiber_g || 0,
    body.sugar_g || 0, body.sodium_mg || 0, body.cholesterol_mg || 0, body.saturated_fat_g || 0,
    body.id, userId,
  );

  return NextResponse.json({ success: true });
}

// DELETE /api/foods?id=123 — Delete a custom food (only your own)
export async function DELETE(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  const db = getDb();
  const foodId = parseInt(id);

  // Verify it's the user's custom food before deleting
  const existing = db.prepare('SELECT id FROM food_items WHERE id = ? AND is_custom = 1 AND user_id = ?').get(foodId, userId);
  if (!existing) return NextResponse.json({ success: false, error: 'Food not found or not yours' }, { status: 403 });

  // Clean up all references first (foreign key constraints)
  db.prepare('DELETE FROM food_log WHERE food_item_id = ? AND user_id = ?').run(foodId, userId);
  db.prepare('UPDATE baseline_slots SET default_food_id = NULL WHERE default_food_id = ? AND user_id = ?').run(foodId, userId);
  db.prepare('DELETE FROM favorite_foods WHERE food_item_id = ?').run(foodId);

  // Now delete the food item
  db.prepare('DELETE FROM food_items WHERE id = ? AND is_custom = 1 AND user_id = ?').run(foodId, userId);

  return NextResponse.json({ success: true });
}
