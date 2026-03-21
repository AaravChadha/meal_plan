'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import NutrientProgress from '@/components/NutrientProgress';
import MacroPieChart from '@/components/MacroPieChart';
import { NUTRIENTS } from '@/lib/nutrients';

interface MealEntry {
  id: number;
  meal_type: string;
  servings: number;
  food_name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  cholesterol_mg: number;
  saturated_fat_g: number;
}

interface SummaryData {
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  total_sugar_g: number;
  total_sodium_mg: number;
  total_cholesterol_mg: number;
  total_saturated_fat_g: number;
  protein_pct: number;
  carbs_pct: number;
  fat_pct: number;
  targets: Record<string, number>;
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export default function Dashboard() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, mealsRes] = await Promise.all([
        fetch(`/api/summary?date=${date}&user_id=1`),
        fetch(`/api/food-log?date=${date}&user_id=1`),
      ]);
      const summaryData = await summaryRes.json();
      const mealsData = await mealsRes.json();

      if (summaryData.success) setSummary(summaryData.data);
      if (mealsData.success) setMeals(mealsData.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteEntry = async (id: number) => {
    try {
      await fetch(`/api/food-log?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  const calorieTarget = summary?.targets?.calories || 2000;
  const caloriesCurrent = summary?.total_calories || 0;
  const caloriesPct = Math.min((caloriesCurrent / calorieTarget) * 100, 100);
  const remaining = Math.max(calorieTarget - caloriesCurrent, 0);

  // SVG ring
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (caloriesPct / 100) * circumference;

  // Build nutrient map for progress bars
  const currentNutrients: Record<string, number> = {
    calories: summary?.total_calories || 0,
    protein_g: summary?.total_protein_g || 0,
    carbs_g: summary?.total_carbs_g || 0,
    fat_g: summary?.total_fat_g || 0,
    fiber_g: summary?.total_fiber_g || 0,
    sugar_g: summary?.total_sugar_g || 0,
    sodium_mg: summary?.total_sodium_mg || 0,
    cholesterol_mg: summary?.total_cholesterol_mg || 0,
    saturated_fat_g: summary?.total_saturated_fat_g || 0,
  };

  const targetNutrients: Record<string, number> = summary?.targets || {
    calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65,
    fiber_g: 30, sugar_g: 50, sodium_mg: 2300, cholesterol_mg: 300, saturated_fat_g: 20,
  };

  // Group meals
  const mealGroups = ['breakfast', 'lunch', 'dinner', 'snack'].map((type) => ({
    type,
    entries: meals.filter((m) => m.meal_type === type),
    totalCal: meals.filter((m) => m.meal_type === type).reduce((sum, m) => sum + m.calories * m.servings, 0),
  }));

  // Alerts
  const alerts: { type: string; message: string }[] = [];
  if (summary) {
    const pPct = targetNutrients.protein_g > 0 ? (currentNutrients.protein_g / targetNutrients.protein_g) * 100 : 0;
    const fPct = targetNutrients.fiber_g > 0 ? (currentNutrients.fiber_g / targetNutrients.fiber_g) * 100 : 0;
    const sPct = targetNutrients.sodium_mg > 0 ? (currentNutrients.sodium_mg / targetNutrients.sodium_mg) * 100 : 0;

    if (meals.length > 0 && pPct < 50) alerts.push({ type: 'warning', message: `Protein is only at ${Math.round(pPct)}% of target — consider adding a protein-rich food` });
    if (meals.length > 0 && fPct < 40) alerts.push({ type: 'warning', message: `Fiber is low at ${Math.round(fPct)}% — try adding veggies, beans, or whole grains` });
    if (sPct > 100) alerts.push({ type: 'danger', message: `Sodium is at ${Math.round(sPct)}% of daily limit — consider reducing processed foods` });
  }

  return (
    <>
      <Header title="Dashboard" date={date} onDateChange={setDate} />
      <div className="page-container">
        {loading ? (
          <div className="stats-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card"><div className="loading-shimmer" style={{ height: 80 }} /></div>
            ))}
          </div>
        ) : (
          <>
            {/* Alerts */}
            {alerts.map((alert, i) => (
              <div key={i} className={`alert-banner ${alert.type}`}>
                {alert.type === 'warning' ? '⚠️' : '🚨'} {alert.message}
              </div>
            ))}

            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card calories">
                <div className="stat-label">Calories</div>
                <div className="stat-value" style={{ color: 'var(--color-calories)' }}>
                  {Math.round(caloriesCurrent)}
                </div>
                <div className="stat-target">of {calorieTarget} kcal</div>
              </div>
              <div className="stat-card protein">
                <div className="stat-label">Protein</div>
                <div className="stat-value" style={{ color: 'var(--color-protein)' }}>
                  {Math.round(currentNutrients.protein_g)}g
                </div>
                <div className="stat-target">of {targetNutrients.protein_g}g target</div>
              </div>
              <div className="stat-card carbs">
                <div className="stat-label">Carbs</div>
                <div className="stat-value" style={{ color: 'var(--color-carbs)' }}>
                  {Math.round(currentNutrients.carbs_g)}g
                </div>
                <div className="stat-target">of {targetNutrients.carbs_g}g target</div>
              </div>
              <div className="stat-card fat">
                <div className="stat-label">Fat</div>
                <div className="stat-value" style={{ color: 'var(--color-fat)' }}>
                  {Math.round(currentNutrients.fat_g)}g
                </div>
                <div className="stat-target">of {targetNutrients.fat_g}g target</div>
              </div>
            </div>

            {/* Main dashboard grid */}
            <div className="dashboard-grid">
              {/* Calorie ring + macro chart */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Calorie Budget</div>
                    <div className="card-subtitle">{Math.round(remaining)} kcal remaining</div>
                  </div>
                </div>
                <div className="calorie-ring-container">
                  <div className="calorie-ring">
                    <svg viewBox="0 0 180 180">
                      <circle className="calorie-ring-bg" cx="90" cy="90" r={radius} />
                      <circle
                        className="calorie-ring-fill"
                        cx="90" cy="90" r={radius}
                        stroke="url(#calorieGradient)"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                      />
                      <defs>
                        <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="50%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="calorie-ring-text">
                      <div className="calorie-ring-value">{Math.round(caloriesCurrent)}</div>
                      <div className="calorie-ring-label">of {calorieTarget} kcal</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Macro Breakdown */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Macro Breakdown</div>
                    <div className="card-subtitle">
                      {summary?.protein_pct || 0}% P · {summary?.carbs_pct || 0}% C · {summary?.fat_pct || 0}% F
                    </div>
                  </div>
                </div>
                <MacroPieChart
                  protein={currentNutrients.protein_g}
                  carbs={currentNutrients.carbs_g}
                  fat={currentNutrients.fat_g}
                />
              </div>

              {/* Nutrient Progress — full width */}
              <div className="card full-width">
                <div className="card-header">
                  <div className="card-title">Nutrient Progress</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px 32px' }}>
                  {NUTRIENTS.filter(n => n.key !== 'calories').map((n) => (
                    <NutrientProgress
                      key={n.key}
                      name={n.label}
                      current={currentNutrients[n.key] || 0}
                      target={targetNutrients[n.key] || 0}
                      unit={n.unit}
                      color={n.color}
                      isLimitType={n.isLimitType}
                    />
                  ))}
                </div>
              </div>

              {/* Meal Timeline — full width */}
              <div className="full-width">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Today&apos;s Meals</h3>
                  <a href="/log" className="btn btn-primary btn-sm">+ Add Food</a>
                </div>
                {meals.length === 0 ? (
                  <div className="card">
                    <div className="empty-state">
                      <div className="empty-state-icon">🍽️</div>
                      <div className="empty-state-title">No meals logged yet</div>
                      <div className="empty-state-text">Start tracking your nutrition by adding your first meal.</div>
                      <a href="/log" className="btn btn-primary" style={{ marginTop: '16px' }}>Log Your First Meal</a>
                    </div>
                  </div>
                ) : (
                  <div className="meals-container">
                    {mealGroups.filter(g => g.entries.length > 0).map((group) => (
                      <div key={group.type} className="meal-section">
                        <div className="meal-header">
                          <div className="meal-header-left">
                            <span className="meal-icon">{MEAL_ICONS[group.type]}</span>
                            <span className="meal-name">{MEAL_LABELS[group.type]}</span>
                          </div>
                          <span className="meal-calories">{Math.round(group.totalCal)} cal</span>
                        </div>
                        <div className="meal-items">
                          {group.entries.map((entry) => (
                            <div key={entry.id} className="meal-item">
                              <div className="meal-item-info">
                                <div className="meal-item-name">{entry.food_name}</div>
                                <div className="meal-item-detail">
                                  {entry.servings !== 1 ? `${entry.servings}× ` : ''}
                                  {entry.serving_size}{entry.serving_unit}
                                  {entry.brand ? ` · ${entry.brand}` : ''}
                                </div>
                              </div>
                              <div className="meal-item-nutrients">
                                <div className="meal-item-nutrient">
                                  <div className="meal-item-nutrient-value" style={{ color: 'var(--color-calories)' }}>
                                    {Math.round(entry.calories * entry.servings)}
                                  </div>
                                  <div className="meal-item-nutrient-label">cal</div>
                                </div>
                                <div className="meal-item-nutrient">
                                  <div className="meal-item-nutrient-value" style={{ color: 'var(--color-protein)' }}>
                                    {Math.round(entry.protein_g * entry.servings)}g
                                  </div>
                                  <div className="meal-item-nutrient-label">protein</div>
                                </div>
                                <div className="meal-item-nutrient">
                                  <div className="meal-item-nutrient-value" style={{ color: 'var(--color-carbs)' }}>
                                    {Math.round(entry.carbs_g * entry.servings)}g
                                  </div>
                                  <div className="meal-item-nutrient-label">carbs</div>
                                </div>
                                <div className="meal-item-nutrient">
                                  <div className="meal-item-nutrient-value" style={{ color: 'var(--color-fat)' }}>
                                    {Math.round(entry.fat_g * entry.servings)}g
                                  </div>
                                  <div className="meal-item-nutrient-label">fat</div>
                                </div>
                              </div>
                              <button
                                className="meal-item-delete"
                                onClick={() => handleDeleteEntry(entry.id)}
                                title="Remove"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
