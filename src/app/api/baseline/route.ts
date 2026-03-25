import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/baseline — get user's baseline slots with their default food details
export async function GET(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const db = getDb();
  const slots = db.prepare(`
    SELECT bs.id, bs.slot_name, bs.default_food_id, bs.sort_order,
           fi.name as food_name, fi.brand, fi.calories, fi.protein_g, fi.carbs_g, fi.fat_g,
           fi.fiber_g, fi.sodium_mg, fi.serving_size, fi.serving_unit
    FROM baseline_slots bs
    LEFT JOIN food_items fi ON fi.id = bs.default_food_id
    WHERE bs.user_id = ?
    ORDER BY bs.sort_order, bs.id
  `).all(userId);

  return NextResponse.json({ success: true, data: slots });
}

// POST /api/baseline — add a new baseline slot
export async function POST(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const { slot_name, default_food_id } = await request.json();
  if (!slot_name) return NextResponse.json({ success: false, error: 'slot_name required' }, { status: 400 });

  const db = getDb();
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM baseline_slots WHERE user_id = ?').get(userId) as { next: number };

  const result = db.prepare(
    'INSERT INTO baseline_slots (user_id, slot_name, default_food_id, sort_order) VALUES (?, ?, ?, ?)'
  ).run(userId, slot_name, default_food_id || null, maxOrder.next);

  return NextResponse.json({ success: true, data: { id: result.lastInsertRowid } });
}

// PUT /api/baseline — update a slot (change name, default food, or reorder)
export async function PUT(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const { id, slot_name, default_food_id, sort_order } = await request.json();
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  const db = getDb();
  // Verify ownership
  const slot = db.prepare('SELECT id FROM baseline_slots WHERE id = ? AND user_id = ?').get(id, userId);
  if (!slot) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  if (slot_name !== undefined) { updates.push('slot_name = ?'); values.push(slot_name); }
  if (default_food_id !== undefined) { updates.push('default_food_id = ?'); values.push(default_food_id); }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order); }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE baseline_slots SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/baseline?id=123 — remove a slot
export async function DELETE(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  const db = getDb();
  db.prepare('DELETE FROM baseline_slots WHERE id = ? AND user_id = ?').run(id, userId);

  return NextResponse.json({ success: true });
}
