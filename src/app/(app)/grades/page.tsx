'use client';

import { useState, useEffect } from 'react';
import Header, { localDate, formatLocalDate } from '@/components/Header';
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
  workout_burn: number;
  rest_deficit: number;
  workout_deficit: number;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_fiber_g: number;
  target_sodium_mg: number;
  rest_target_calories: number;
  rest_target_protein_g: number;
  rest_target_carbs_g: number;
  rest_target_fat_g: number;
  rest_target_fiber_g: number;
  rest_target_sodium_mg: number;
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

// ── Workout vs Rest comparison table ─────────────────────────────────
function ComparisonTable({ profile }: { profile: Profile }) {
  const rows = [
    { label: 'Calories', workout: profile.target_calories, rest: profile.rest_target_calories, unit: 'kcal', color: 'var(--color-calories)' },
    { label: 'Protein', workout: profile.target_protein_g, rest: profile.rest_target_protein_g, unit: 'g', color: 'var(--color-protein)' },
    { label: 'Carbs', workout: profile.target_carbs_g, rest: profile.rest_target_carbs_g, unit: 'g', color: 'var(--color-carbs)' },
    { label: 'Fat', workout: profile.target_fat_g, rest: profile.rest_target_fat_g, unit: 'g', color: 'var(--color-fat)' },
    { label: 'Fiber', workout: profile.target_fiber_g, rest: profile.rest_target_fiber_g, unit: 'g', color: 'var(--text-muted)' },
    { label: 'Sodium', workout: profile.target_sodium_mg, rest: profile.rest_target_sodium_mg, unit: 'mg', color: 'var(--text-muted)' },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Workout vs Rest Day Targets</div>
        <div className="card-subtitle">What you should eat on each type of day</div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '1px', background: 'var(--border-primary)',
        border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
      }}>
        {/* Header row */}
        {['Macro', '🏋️ Workout', '😴 Rest'].map(h => (
          <div key={h} style={{
            background: 'var(--bg-elevated)', padding: '10px 14px',
            fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)',
            textAlign: h === 'Macro' ? 'left' : 'center',
          }}>{h}</div>
        ))}

        {/* Data rows */}
        {rows.map(r => (
          [
            <div key={`${r.label}-label`} style={{ background: 'var(--bg-card)', padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: r.color }}>{r.label}</div>,
            <div key={`${r.label}-workout`} style={{ background: 'var(--bg-card)', padding: '10px 14px', textAlign: 'center', fontSize: '14px', fontWeight: 700 }}>
              {r.workout}<span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}> {r.unit}</span>
            </div>,
            <div key={`${r.label}-rest`} style={{ background: 'var(--bg-card)', padding: '10px 14px', textAlign: 'center', fontSize: '14px', fontWeight: 700 }}>
              {r.rest}<span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}> {r.unit}</span>
            </div>,
          ]
        ))}
      </div>

      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Workout days have more carbs for fuel and recovery. Rest days lower carbs and fat since you burn fewer calories.
        Grades are based on whichever targets match your day type.
      </div>
    </div>
  );
}

// ── Grading rubric ──────────────────────────────────────────────────
function GradingRubric({ goal }: { goal: string }) {
  const rubric = [
    { grade: 'A+' as LetterGrade, range: '97-100', desc: 'All macros hit target range' },
    { grade: 'A' as LetterGrade, range: '93-96', desc: 'Nearly perfect — one macro slightly off' },
    { grade: 'A-' as LetterGrade, range: '90-92', desc: 'Great day — minor misses' },
    { grade: 'B+' as LetterGrade, range: '87-89', desc: 'Most macros on target' },
    { grade: 'B' as LetterGrade, range: '83-86', desc: 'Good effort — room to improve' },
    { grade: 'B-' as LetterGrade, range: '80-82', desc: 'Decent — a couple macros off' },
    { grade: 'C+' as LetterGrade, range: '77-79', desc: 'Some targets missed' },
    { grade: 'C' as LetterGrade, range: '73-76', desc: 'Multiple targets off' },
    { grade: 'C-' as LetterGrade, range: '70-72', desc: 'Below average adherence' },
    { grade: 'D' as LetterGrade, range: '60-69', desc: 'Significantly off targets' },
    { grade: 'F' as LetterGrade, range: '<60', desc: 'Most targets missed or no data' },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">How Grades Work</div>
      </div>

      {/* Weight breakdown */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>Score Weights</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { label: 'Calories', weight: '25%' },
            { label: 'Protein', weight: '25%' },
            { label: 'Fiber', weight: '15%' },
            { label: 'Sodium', weight: '15%' },
            { label: 'Carbs', weight: '10%' },
            { label: 'Fat', weight: '10%' },
          ].map(w => (
            <span key={w.label} style={{
              padding: '4px 10px', borderRadius: '12px', fontSize: '11px',
              background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
            }}>
              {w.label} <span style={{ fontWeight: 700 }}>{w.weight}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Calorie bias note */}
      <div style={{
        padding: '8px 12px', marginBottom: '16px',
        background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)',
        fontSize: '12px', color: 'var(--accent-indigo)',
      }}>
        {goal === 'cut'
          ? 'On a cut: being slightly under your calorie target is graded better than going over — the deficit is the goal.'
          : goal === 'bulk'
          ? 'On a bulk: hitting or slightly exceeding calories is graded better than falling short.'
          : 'Calories are graded symmetrically — aim to stay within 10% of target.'}
      </div>

      {/* Grade scale */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: '1px', fontSize: '12px' }}>
        {rubric.map(r => (
          <div key={r.grade} style={{ display: 'contents' }}>
            <div style={{ padding: '5px 8px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: GRADE_COLORS[r.grade], fontSize: '13px', width: '24px' }}>{r.grade}</span>
            </div>
            <div style={{ padding: '5px 8px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '11px' }}>{r.range}</div>
            <div style={{ padding: '5px 8px', color: 'var(--text-secondary)' }}>{r.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function GradesPage() {
  const [date, setDate] = useState(() => localDate());
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
        if (profileRes.status === 401) { window.location.href = '/login'; return; }
        const profileData = await profileRes.json();
        if (!profileData.success) return;
        const p: Profile = profileData.data;
        setProfile(p);

        // Today's summary
        const todayRes = await fetch(`/api/summary?date=${date}`);
        if (todayRes.status === 401) { window.location.href = '/login'; return; }
        const todayData = await todayRes.json();

        // Last 7 days
        const endDate = date;
        const startDate = new Date(date + 'T00:00:00');
        startDate.setDate(startDate.getDate() - 6);
        const start = formatLocalDate(startDate);
        const weekRes = await fetch(`/api/summary?start=${start}&end=${endDate}`);
        if (weekRes.status === 401) { window.location.href = '/login'; return; }
        const weekData = await weekRes.json();

        // Use targets from today's summary (day-type-aware: rest vs workout)
        if (todayData.success) {
          const dayTargets = todayData.data.targets ?? {
            calories: p.target_calories, protein_g: p.target_protein_g,
            carbs_g: p.target_carbs_g, fat_g: p.target_fat_g,
            fiber_g: p.target_fiber_g, sodium_mg: p.target_sodium_mg,
          };
          setTodayGrade(gradeDay({ ...todayData.data, date }, dayTargets, p.goal));
        }

        // For weekly history, use workout targets as default (range query doesn't include per-day targets)
        const defaultTargets = {
          calories: p.target_calories, protein_g: p.target_protein_g,
          carbs_g: p.target_carbs_g, fat_g: p.target_fat_g,
          fiber_g: p.target_fiber_g, sodium_mg: p.target_sodium_mg,
        };
        if (weekData.success) {
          setWeekGrades(weekData.data.map((d: Record<string, number>) =>
            gradeDay(d, defaultTargets, p.goal)
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
          <>
            {/* Comparison table — full width */}
            {profile && <ComparisonTable profile={profile} />}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
              {/* Left: today + history */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {todayGrade && <OverallGradeCard dayGrade={todayGrade} />}
                <WeekHistory grades={weekGrades} />
              </div>

              {/* Right: calibration + rubric */}
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
                {profile && <GradingRubric goal={profile.goal} />}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
