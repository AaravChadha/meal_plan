import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/foods/recent — returns recent + frequent foods for the logged-in user
export async function GET(request: NextRequest) {
  const userId = getSessionUser(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const db = getDb();

  // Recent: last 10 unique foods logged (most recent first)
  const recent = db.prepare(`
    SELECT fi.*, MAX(fl.created_at) as last_logged, 'recent' as suggestion_type
    FROM food_log fl
    JOIN food_items fi ON fi.id = fl.food_item_id
    WHERE fl.user_id = ?
    GROUP BY fl.food_item_id
    ORDER BY MAX(fl.created_at) DESC
    LIMIT 10
  `).all(userId);

  // Frequent: top 10 most logged foods (by count), excluding ones already in recent
  const recentIds = (recent as { id: number }[]).map(r => r.id);
  const placeholders = recentIds.length > 0 ? recentIds.map(() => '?').join(',') : '0';
  const frequent = db.prepare(`
    SELECT fi.*, COUNT(fl.id) as log_count, 'frequent' as suggestion_type
    FROM food_log fl
    JOIN food_items fi ON fi.id = fl.food_item_id
    WHERE fl.user_id = ? AND fl.food_item_id NOT IN (${placeholders})
    GROUP BY fl.food_item_id
    ORDER BY COUNT(fl.id) DESC
    LIMIT 10
  `).all(userId, ...recentIds);

  return NextResponse.json({
    success: true,
    data: { recent, frequent },
  });
}
