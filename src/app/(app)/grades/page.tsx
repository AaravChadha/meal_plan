'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import {
  gradeDay, gradeCalibration,
  GRADE_COLORS, scoreToGrade,
  type DayGrade, type LetterGrade, type CalibrationReport,
} from '@/lib/grades';
import { generateSmartSuggestion, type ActivityLevel, type Goal, type Gender, type SmartSuggestion } from '@/lib/tdee';

interface Profile {
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  activity_level: string;
  goal: string;
  gender: string;
  body_fat_pct: number | null;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_fiber_g: number;
  target_sodium_mg: number;
}

// ── Small reusable grade badge ────────────────────────────────────────
function GradeBadge({ grade, size = 'md' }: { grade: LetterGrade; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 28, md: 44, lg: 72 };
  const fonts = { sm: 13, md: 18, lg: 32 };
  const s = sizes[size];
  return (
    <div style={{
      width: s, height: s, borderRadius: '50%',
      background: GRADE_COLORS[grade] + '22',
      border: `2px solid ${GRADE_COLORS[grade]}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: fonts[size], color: GRADE_COLORS[grade],
      flexShrink: 0,
    }}>
      {grade}
    </div>
  );
}

// ── Big overall grade card ────────────────────────────────────────────
function OverallGradeCard({ dayGrade }: { dayGrade: DayGrade }) {
  if (!dayGrade.logged_anything) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
        <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No meals logged today</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Log some food to get your daily grade.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
        <GradeBadge grade={dayGrade.overall_grade} size="lg" />
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700 }}>Today&apos;s Report Card</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Overall score: {dayGrade.overall_score}/100
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {dayGrade.nutrients.map(n => (
          <div key={n.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <GradeBadge grade={n.grade} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{n.label}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {n.current}{n.unit} / {n.target}{n.unit}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '3px',
                  background: GRADE_COLORS[n.grade],
                  width: `${n.isLimitType
                    ? Math.min(100, (n.current / n.target) * 100)
                    : Math.min(100, (n.current / n.target) * 100)}%`,
                  transition: 'width 0.4s',
                }} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                {n.feedback}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 7-day history table ───────────────────────────────────────────────
function WeekHistory({ grades }: { grades: DayGrade[] }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">7-Day History</div>
      </div>

      {grades.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
          No data yet — start logging meals to build your history.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[...grades].reverse().map(g => {
            const label = new Date(g.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <div key={g.date} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border-primary)' }}>
                <GradeBadge grade={g.overall_grade} size="sm" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{label}</div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    {g.nutrients.slice(0, 4).map(n => (
                      <span key={n.key} style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ color: GRADE_COLORS[n.grade], fontWeight: 700 }}>{n.grade}</span> {n.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {g.logged_anything ? `${g.overall_score}/100` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Calibration card ─────────────────────────────────────────────────
function CalibrationCard({ report, goal, suggestion, customCalories }: {
  report: CalibrationReport;
  goal: string;
  suggestion: SmartSuggestion;
  customCalories: number;
}) {
  const goalLabel: Record<string, string> = { cut: 'cut (lose weight)', bulk: 'bulk (build muscle)', maintain: 'maintain weight' };

  // Deficit = how many kcal below TDEE. Positive = deficit, negative = surplus.
  const yourDeficit = suggestion.tdee - customCalories;
  const suggestedDeficit = suggestion.tdee - suggestion.calories;
  const isYourDeficit = yourDeficit > 0;

  // Rough weight change estimate: ~7700 kcal ≈ 1 kg of body weight
  const yourRateKgPerWeek = (Math.abs(yourDeficit) * 7) / 7700;
  const yourRateStr = yourDeficit === 0
    ? 'Maintaining weight'
    : `~${yourRateKgPerWeek.toFixed(2)} kg/week ${isYourDeficit ? 'loss' : 'gain'}`;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Target Calibration</div>
          <div className="card-subtitle">How your custom targets compare to what was suggested for your goal to {goalLabel[goal] ?? goal}</div>
        </div>
        <GradeBadge grade={report.overall_grade} size="md" />
      </div>

      {/* ── Calorie balance breakdown ─────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '1px', background: 'var(--border-primary)',
        border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)',
        overflow: 'hidden', marginBottom: '16px',
      }}>
        {[
          { label: 'TDEE (maintenance)', value: `${suggestion.tdee.toLocaleString()} kcal`, sub: 'what you burn daily', color: 'var(--text-primary)' },
          { label: 'Suggested target', value: `${suggestion.calories.toLocaleString()} kcal`, sub: suggestedDeficit > 0 ? `−${suggestedDeficit} kcal/day deficit` : suggestedDeficit < 0 ? `+${Math.abs(suggestedDeficit)} kcal/day surplus` : 'at maintenance', color: '#4ecdc4' },
          { label: 'Your target', value: `${customCalories.toLocaleString()} kcal`, sub: yourDeficit > 0 ? `−${yourDeficit} kcal/day deficit` : yourDeficit < 0 ? `+${Math.abs(yourDeficit)} kcal/day surplus` : 'at maintenance', color: GRADE_COLORS[report.items.find(i => i.key === 'calories')?.grade ?? 'B'] },
        ].map(col => (
          <div key={col.label} style={{ background: 'var(--bg-card)', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{col.label}</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: col.color }}>{col.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{col.sub}</div>
          </div>
        ))}
      </div>

      {/* Estimated rate */}
      <div style={{
        padding: '8px 12px', marginBottom: '16px',
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
        fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: 'var(--text-muted)' }}>Estimated rate at your target:</span>
        <span style={{ fontWeight: 600 }}>{yourRateStr}</span>
      </div>

      <div style={{
        padding: '10px 14px', marginBottom: '16px',
        background: report.overall_grade.startsWith('A') || report.overall_grade.startsWith('B')
          ? 'rgba(16,185,129,0.08)' : 'rgba(255,107,107,0.08)',
        border: `1px solid ${GRADE_COLORS[report.overall_grade]}44`,
        borderRadius: 'var(--radius-sm)', fontSize: '13px',
        color: report.overall_grade.startsWith('A') || report.overall_grade.startsWith('B')
          ? '#10b981' : GRADE_COLORS[report.overall_grade],
      }}>
        {report.overall_grade.startsWith('A')
          ? 'Your targets are well-calibrated to your goal.'
          : report.overall_grade.startsWith('B')
          ? 'Your targets are mostly aligned — minor adjustments could help.'
          : 'Some targets differ significantly from recommendations. Consider reviewing.'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {report.items.map(item => {
          const diff = item.custom - item.suggested;
          const diffSign = diff > 0 ? '+' : '';
          const diffPct = item.suggested !== 0 ? Math.round((diff / item.suggested) * 100) : 0;
          return (
            <div key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <GradeBadge grade={item.grade} size="sm" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {item.suggested}{item.unit} suggested → {item.custom}{item.unit} yours
                    {' '}
                    <span style={{ color: diff === 0 ? 'var(--text-muted)' : diff > 0 ? '#ff8c42' : '#10b981', fontWeight: 600 }}>
                      ({diffSign}{diff}{item.unit}, {diffSign}{diffPct}%)
                    </span>
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.message}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function GradesPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [todayGrade, setTodayGrade] = useState<DayGrade | null>(null);
  const [weekGrades, setWeekGrades] = useState<DayGrade[]>([]);
  const [calibration, setCalibration] = useState<CalibrationReport | null>(null);
  const [suggestion, setSuggestion] = useState<SmartSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch profile for targets + suggestion
        const profileRes = await fetch('/api/profile');
        const profileData = await profileRes.json();
        if (!profileData.success) return;
        const p: Profile = profileData.data;
        setProfile(p);

        // Today's summary
        const todayRes = await fetch(`/api/summary?date=${date}`);
        const todayData = await todayRes.json();

        // Last 7 days
        const endDate = date;
        const startDate = new Date(date + 'T00:00:00');
        startDate.setDate(startDate.getDate() - 6);
        const start = startDate.toISOString().slice(0, 10);
        const weekRes = await fetch(`/api/summary?start=${start}&end=${endDate}`);
        const weekData = await weekRes.json();

        const targets = {
          calories: p.target_calories,
          protein_g: p.target_protein_g,
          carbs_g: p.target_carbs_g,
          fat_g: p.target_fat_g,
          fiber_g: p.target_fiber_g,
          sodium_mg: p.target_sodium_mg,
        };

        if (todayData.success) {
          setTodayGrade(gradeDay({ ...todayData.data, date }, targets));
        }

        if (weekData.success) {
          setWeekGrades(weekData.data.map((d: Record<string, number>) =>
            gradeDay(d, targets)
          ));
        }

        // Calibration: only if we can generate a suggestion
        if (p.weight_kg && p.height_cm && p.age) {
          const sugg = generateSmartSuggestion(
            p.weight_kg, p.height_cm, p.age,
            p.activity_level as ActivityLevel,
            p.goal as Goal,
            (p.gender || 'neutral') as Gender,
            p.body_fat_pct,
          );
          setSuggestion(sugg);
          setCalibration(gradeCalibration(
            { calories: p.target_calories, protein_g: p.target_protein_g, carbs_g: p.target_carbs_g, fat_g: p.target_fat_g, fiber_g: p.target_fiber_g, sodium_mg: p.target_sodium_mg },
            { calories: sugg.calories, protein_g: sugg.protein_g, carbs_g: sugg.carbs_g, fat_g: sugg.fat_g, fiber_g: sugg.fiber_g },
            p.goal,
          ));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [date]);

  return (
    <>
      <Header title="Goals & Grades" date={date} onDateChange={setDate} />
      <div className="page-container">
        {loading ? (
          <div className="card"><div className="loading-shimmer" style={{ height: 300 }} /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Left: today + history */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {todayGrade && <OverallGradeCard dayGrade={todayGrade} />}
              <WeekHistory grades={weekGrades} />
            </div>

            {/* Right: calibration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {calibration && profile && suggestion ? (
                <CalibrationCard report={calibration} goal={profile.goal} suggestion={suggestion} customCalories={profile.target_calories} />
              ) : (
                <div className="card">
                  <div className="card-header"><div className="card-title">Target Calibration</div></div>
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    Fill in your age, weight, and height on the Profile page to see how your targets compare to recommendations.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
