import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { calcMacroPercentages } from '@/lib/nutrients';

// GET /api/summary?date=2024-01-15&user_id=1
// GET /api/summary?start=2024-01-01&end=2024-01-07&user_id=1  (range)
export async function GET(request: NextRequest) {
  const userId = parseInt(request.nextUrl.searchParams.get('user_id') || '1');
  const date = request.nextUrl.searchParams.get('date');
  const start = request.nextUrl.searchParams.get('start');
  const end = request.nextUrl.searchParams.get('end');

  const db = getDb();

  // Range query for analytics
  if (start && end) {
    const rows = db.prepare(`
      SELECT
        fl.logged_date as date,
        COALESCE(SUM(fi.calories * fl.servings), 0) as total_calories,
        COALESCE(SUM(fi.protein_g * fl.servings), 0) as total_protein_g,
        COALESCE(SUM(fi.carbs_g * fl.servings), 0) as total_carbs_g,
        COALESCE(SUM(fi.fat_g * fl.servings), 0) as total_fat_g,
        COALESCE(SUM(fi.fiber_g * fl.servings), 0) as total_fiber_g,
        COALESCE(SUM(fi.sugar_g * fl.servings), 0) as total_sugar_g,
        COALESCE(SUM(fi.sodium_mg * fl.servings), 0) as total_sodium_mg,
        COALESCE(SUM(fi.cholesterol_mg * fl.servings), 0) as total_cholesterol_mg,
        COALESCE(SUM(fi.saturated_fat_g * fl.servings), 0) as total_saturated_fat_g
      FROM food_log fl
      JOIN food_items fi ON fl.food_item_id = fi.id
      WHERE fl.user_id = ? AND fl.logged_date BETWEEN ? AND ?
      GROUP BY fl.logged_date
      ORDER BY fl.logged_date
    `).all(userId, start, end) as Record<string, number>[];

    const enriched = rows.map((row) => ({
      ...row,
      ...calcMacroPercentages(row.total_protein_g, row.total_carbs_g, row.total_fat_g),
    }));

    return NextResponse.json({ success: true, data: enriched });
  }

  // Single day summary
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const row = db.prepare(`
    SELECT
      COALESCE(SUM(fi.calories * fl.servings), 0) as total_calories,
      COALESCE(SUM(fi.protein_g * fl.servings), 0) as total_protein_g,
      COALESCE(SUM(fi.carbs_g * fl.servings), 0) as total_carbs_g,
      COALESCE(SUM(fi.fat_g * fl.servings), 0) as total_fat_g,
      COALESCE(SUM(fi.fiber_g * fl.servings), 0) as total_fiber_g,
      COALESCE(SUM(fi.sugar_g * fl.servings), 0) as total_sugar_g,
      COALESCE(SUM(fi.sodium_mg * fl.servings), 0) as total_sodium_mg,
      COALESCE(SUM(fi.cholesterol_mg * fl.servings), 0) as total_cholesterol_mg,
      COALESCE(SUM(fi.saturated_fat_g * fl.servings), 0) as total_saturated_fat_g
  FROM food_log fl
  JOIN food_items fi ON fl.food_item_id = fi.id
  WHERE fl.user_id = ? AND fl.logged_date = ?
  `).get(userId, targetDate) as Record<string, number>;

  // Get user targets
  const user = db.prepare(`
    SELECT target_calories, target_protein_g, target_carbs_g, target_fat_g,
           target_fiber_g, target_sodium_mg
    FROM users WHERE id = ?
  `).get(userId) as Record<string, number>;

  const macros = calcMacroPercentages(row.total_protein_g, row.total_carbs_g, row.total_fat_g);

  const summary = {
    date: targetDate,
    ...row,
    ...macros,
    targets: {
      calories: user?.target_calories || 2000,
      protein_g: user?.target_protein_g || 150,
      carbs_g: user?.target_carbs_g || 250,
      fat_g: user?.target_fat_g || 65,
      fiber_g: user?.target_fiber_g || 30,
      sugar_g: 50,
      sodium_mg: user?.target_sodium_mg || 2300,
      cholesterol_mg: 300,
      saturated_fat_g: 20,
    },
  };

  return NextResponse.json({ success: true, data: summary });
}
