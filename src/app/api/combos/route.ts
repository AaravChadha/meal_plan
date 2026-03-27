import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface ComboItem {
  food_item_id: number;
  servings: number;
}

// GET /api/combos — get all combos for the current user
export async function GET(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const db = getDb();
  const combos = db.prepare(`
    SELECT c.id, c.name, c.created_at,
      GROUP_CONCAT(ci.food_item_id) as item_ids,
      GROUP_CONCAT(ci.servings) as item_servings,
      GROUP_CONCAT(fi.name, '|||') as item_names,
      SUM(fi.calories * ci.servings) as total_calories,
      SUM(fi.protein_g * ci.servings) as total_protein_g,
      SUM(fi.carbs_g * ci.servings) as total_carbs_g,
      SUM(fi.fat_g * ci.servings) as total_fat_g
    FROM food_combos c
    JOIN food_combo_items ci ON ci.combo_id = c.id
    JOIN food_items fi ON fi.id = ci.food_item_id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY c.name
  `).all(userId);

  // Parse into structured data
  const result = combos.map((c: Record<string, unknown>) => ({
    id: c.id,
    name: c.name,
    created_at: c.created_at,
    total_calories: Math.round(c.total_calories as number),
    total_protein_g: Math.round(c.total_protein_g as number),
    total_carbs_g: Math.round(c.total_carbs_g as number),
    total_fat_g: Math.round(c.total_fat_g as number),
    items: (c.item_ids as string).split(',').map((id: string, i: number) => ({
      food_item_id: parseInt(id),
      servings: parseFloat((c.item_servings as string).split(',')[i]),
      name: (c.item_names as string).split('|||')[i],
    })),
  }));

  return NextResponse.json({ success: true, data: result });
}

// POST /api/combos — create a new combo
export async function POST(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  try {
    const { name, items } = await request.json() as { name: string; items: ComboItem[] };
    if (!name?.trim()) return NextResponse.json({ success: false, error: 'Name required' }, { status: 400 });
    if (!items || items.length < 2) return NextResponse.json({ success: false, error: 'At least 2 items required' }, { status: 400 });

    const db = getDb();
    const combo = db.prepare('INSERT INTO food_combos (user_id, name) VALUES (?, ?)').run(userId, name.trim());
    const comboId = combo.lastInsertRowid;

    const insertItem = db.prepare('INSERT INTO food_combo_items (combo_id, food_item_id, servings) VALUES (?, ?, ?)');
    for (const item of items) {
      insertItem.run(comboId, item.food_item_id, item.servings || 1);
    }

    return NextResponse.json({ success: true, data: { id: comboId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

// DELETE /api/combos?id=123 — delete a combo
export async function DELETE(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  const db = getDb();
  // Verify ownership
  const combo = db.prepare('SELECT id FROM food_combos WHERE id = ? AND user_id = ?').get(parseInt(id), userId);
  if (!combo) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  db.prepare('DELETE FROM food_combo_items WHERE combo_id = ?').run(parseInt(id));
  db.prepare('DELETE FROM food_combos WHERE id = ?').run(parseInt(id));

  return NextResponse.json({ success: true });
}
