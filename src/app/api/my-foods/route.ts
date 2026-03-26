import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/my-foods — get all custom foods for the current user
export async function GET(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const db = getDb();
  const foods = db.prepare(`
    SELECT id, name, brand, serving_size, serving_unit,
           calories, protein_g, carbs_g, fat_g, fiber_g,
           sugar_g, sodium_mg, cholesterol_mg, saturated_fat_g, is_custom
    FROM food_items
    WHERE is_custom = 1 AND user_id = ?
    ORDER BY name
  `).all(userId);

  return NextResponse.json({ success: true, data: foods });
}
