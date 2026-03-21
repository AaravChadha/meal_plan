import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { searchUSDA, ParsedFood } from '@/lib/usda';

// GET /api/foods?q=chicken&source=all
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || '';
  const source = request.nextUrl.searchParams.get('source') || 'all';

  if (!q || q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  const db = getDb();
  let results: Record<string, unknown>[] = [];

  // Search local database
  if (source === 'all' || source === 'local') {
    const localResults = db.prepare(`
      SELECT * FROM food_items
      WHERE name LIKE ? OR brand LIKE ? OR category LIKE ?
      ORDER BY
        CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
        name
      LIMIT 15
    `).all(`%${q}%`, `%${q}%`, `%${q}%`, `${q}%`) as Record<string, unknown>[];

    results = localResults.map((r) => ({ ...r, source: 'local' }));
  }

  // Search USDA API
  if ((source === 'all' || source === 'usda') && results.length < 10) {
    try {
      const usdaResults = await searchUSDA(q, 8);
      const usdaMapped = usdaResults.map((f: ParsedFood) => ({
        id: null,
        ...f,
        is_custom: 0,
        source: 'usda',
      }));
      results = [...results, ...usdaMapped];
    } catch {
      // Fall back to local results only
    }
  }

  return NextResponse.json({ success: true, data: results });
}

// POST /api/foods — Add a custom food or save a USDA food locally
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getDb();

    // If it has an fdc_id, check if already saved
    if (body.fdc_id) {
      const existing = db.prepare('SELECT id FROM food_items WHERE fdc_id = ?').get(body.fdc_id) as { id: number } | undefined;
      if (existing) {
        return NextResponse.json({ success: true, data: { id: existing.id } });
      }
    }

    const result = db.prepare(`
      INSERT INTO food_items (name, brand, category, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, cholesterol_mg, saturated_fat_g, fdc_id, is_custom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      body.is_custom ?? 1,
    );

    return NextResponse.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
