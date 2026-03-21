'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import TrendChart from '@/components/TrendChart';
import MacroPieChart from '@/components/MacroPieChart';

interface DaySummary {
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  total_sodium_mg: number;
}

export default function AnalyticsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [range, setRange] = useState<'7' | '14' | '30'>('7');
  const [data, setData] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      const end = date;
      const startDate = new Date(date + 'T00:00:00');
      startDate.setDate(startDate.getDate() - parseInt(range) + 1);
      const start = startDate.toISOString().slice(0, 10);

      try {
        const res = await fetch(`/api/summary?start=${start}&end=${end}&user_id=1`);
        const result = await res.json();
        if (result.success) setData(result.data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [date, range]);

  // Build chart data
  const labels = data.map((d) => {
    const dt = new Date(d.date + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const avgCalories = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.total_calories, 0) / data.length) : 0;
  const avgProtein = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.total_protein_g, 0) / data.length) : 0;
  const avgCarbs = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.total_carbs_g, 0) / data.length) : 0;
  const avgFat = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.total_fat_g, 0) / data.length) : 0;
  const avgFiber = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.total_fiber_g, 0) / data.length) : 0;
  const avgSodium = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.total_sodium_mg, 0) / data.length) : 0;

  // Insights
  const insights: { type: string; msg: string }[] = [];
  if (data.length > 0) {
    if (avgProtein < 100) insights.push({ type: 'warning', msg: `Average protein (${avgProtein}g) is below recommended levels. Try adding more lean meats, eggs, or Greek yogurt.` });
    if (avgFiber < 20) insights.push({ type: 'warning', msg: `Fiber intake is low (avg ${avgFiber}g). Add more vegetables, fruits, and whole grains.` });
    if (avgSodium > 2500) insights.push({ type: 'danger', msg: `Sodium is consistently high (avg ${avgSodium}mg). Consider reducing processed and restaurant foods.` });
    if (avgCalories > 0 && avgProtein > 120) insights.push({ type: 'success', msg: `Great protein intake! Averaging ${avgProtein}g daily over the last ${range} days.` });
    if (data.length >= 5) {
      const recent = data.slice(-3).reduce((s, d) => s + d.total_calories, 0) / 3;
      const earlier = data.slice(0, 3).reduce((s, d) => s + d.total_calories, 0) / 3;
      if (recent < earlier * 0.85) insights.push({ type: 'success', msg: `Calorie intake trending down — ${Math.round(earlier - recent)} kcal/day less than last week.` });
    }
  }

  return (
    <>
      <Header title="Analytics" date={date} onDateChange={setDate} />
      <div className="page-container">
        {/* Range Selector */}
        <div className="tabs" style={{ maxWidth: 300 }}>
          {(['7', '14', '30'] as const).map((r) => (
            <button
              key={r}
              className={`tab ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r} Days
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card"><div className="loading-shimmer" style={{ height: 300 }} /></div>
        ) : data.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-title">No data yet</div>
              <div className="empty-state-text">Start logging meals to see your nutrition trends and insights.</div>
            </div>
          </div>
        ) : (
          <>
            {/* Insights */}
            {insights.map((insight, i) => (
              <div key={i} className={`alert-banner ${insight.type}`}>
                {insight.type === 'warning' ? '⚠️' : insight.type === 'danger' ? '🚨' : '✅'} {insight.msg}
              </div>
            ))}

            {/* Summary Stats */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card calories">
                <div className="stat-label">Avg. Calories</div>
                <div className="stat-value" style={{ color: 'var(--color-calories)' }}>{avgCalories}</div>
                <div className="stat-target">kcal/day over {data.length} days</div>
              </div>
              <div className="stat-card protein">
                <div className="stat-label">Avg. Protein</div>
                <div className="stat-value" style={{ color: 'var(--color-protein)' }}>{avgProtein}g</div>
                <div className="stat-target">per day</div>
              </div>
              <div className="stat-card carbs">
                <div className="stat-label">Avg. Carbs</div>
                <div className="stat-value" style={{ color: 'var(--color-carbs)' }}>{avgCarbs}g</div>
                <div className="stat-target">per day</div>
              </div>
              <div className="stat-card fat">
                <div className="stat-label">Avg. Fat</div>
                <div className="stat-value" style={{ color: 'var(--color-fat)' }}>{avgFat}g</div>
                <div className="stat-target">per day</div>
              </div>
            </div>

            <div className="analytics-grid">
              {/* Calorie Trend */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Calorie Trend</div>
                </div>
                <TrendChart
                  labels={labels}
                  datasets={[
                    { label: 'Calories', data: data.map((d) => Math.round(d.total_calories)), color: '#ff6b6b' },
                  ]}
                  yAxisLabel="Calories (kcal)"
                />
              </div>

              {/* Average Macro Breakdown */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Avg. Macros</div>
                    <div className="card-subtitle">Over {data.length} days</div>
                  </div>
                </div>
                <MacroPieChart protein={avgProtein} carbs={avgCarbs} fat={avgFat} />
              </div>

              {/* Macro Trends — full width */}
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-header">
                  <div className="card-title">Macronutrient Trends</div>
                </div>
                <TrendChart
                  labels={labels}
                  datasets={[
                    { label: 'Protein (g)', data: data.map((d) => Math.round(d.total_protein_g)), color: '#4ecdc4' },
                    { label: 'Carbs (g)', data: data.map((d) => Math.round(d.total_carbs_g)), color: '#ffe66d' },
                    { label: 'Fat (g)', data: data.map((d) => Math.round(d.total_fat_g)), color: '#ff8c42' },
                  ]}
                  yAxisLabel="Grams"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
