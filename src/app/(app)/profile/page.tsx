'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { generateSmartSuggestion, BASE_ACTIVITY_LABELS, GOAL_LABELS, ActivityLevel, Goal, Gender } from '@/lib/tdee';

// ── Small inline unit toggle button ────────────────────────────────
function UnitToggle({ options, value, onChange }: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: '2px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          border: 'none', background: value === o ? 'var(--accent-indigo)' : 'transparent',
          color: value === o ? '#fff' : 'var(--text-muted)', transition: 'background 0.15s',
        }}>
          {o}
        </button>
      ))}
    </div>
  );
}

// ── Unit conversion helpers ─────────────────────────────────────────
const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number) => Math.round((lbs / 2.20462) * 10) / 10;

// Returns { feet, inches } from centimeters
const cmToFtIn = (cm: number) => {
  const totalInches = cm / 2.54;
  return { feet: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
};
// Returns cm from feet + inches
const ftInToCm = (feet: number, inches: number) => Math.round((feet * 12 + inches) * 2.54 * 10) / 10;

interface UserProfile {
  id: number;
  name: string;
  email: string;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  activity_level: string;
  rest_activity_level: string;
  workout_burn: number;
  rest_deficit: number;
  workout_deficit: number;
  custom_tdee: number | null;
  goal: string;
  gender: string;
  body_fat_pct: number | null;
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

export default function ProfilePage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [customizing, setCustomizing] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');

  // Derived display values — converted from stored metric values
  const displayWeight = profile?.weight_kg
    ? (weightUnit === 'lbs' ? kgToLbs(profile.weight_kg) : profile.weight_kg)
    : '';
  const displayHeightFtIn = profile?.height_cm ? cmToFtIn(profile.height_cm) : { feet: '', inches: '' };
  const displayHeightCm = profile?.height_cm ?? '';

  useEffect(() => {
    fetch('/api/profile')
      .then(r => {
        if (r.status === 401) { window.location.href = '/login'; return null; }
        return r.json();
      })
      .then(data => { if (data?.success) setProfile(data.data); })
      .finally(() => setLoading(false));
  }, []);

  // Rest day suggestion: base TDEE (or custom), no workout burn, rest deficit
  const restSuggestion = useMemo(() => {
    if (!profile?.weight_kg || !profile?.height_cm || !profile?.age) return null;
    return generateSmartSuggestion(
      profile.weight_kg, profile.height_cm, profile.age,
      profile.activity_level as ActivityLevel,
      profile.goal as Goal,
      (profile.gender || 'neutral') as Gender,
      profile.body_fat_pct,
      0,
      profile.rest_deficit ?? -500,
      profile.custom_tdee,
    );
  }, [profile?.weight_kg, profile?.height_cm, profile?.age, profile?.activity_level, profile?.goal, profile?.gender, profile?.body_fat_pct, profile?.rest_deficit, profile?.custom_tdee]);

  // Workout day suggestion: base TDEE (or custom) + workout burn, workout deficit
  const suggestion = useMemo(() => {
    if (!profile?.weight_kg || !profile?.height_cm || !profile?.age) return null;
    return generateSmartSuggestion(
      profile.weight_kg, profile.height_cm, profile.age,
      profile.activity_level as ActivityLevel,
      profile.goal as Goal,
      (profile.gender || 'neutral') as Gender,
      profile.body_fat_pct,
      profile.workout_burn ?? 400,
      profile.workout_deficit ?? -500,
      profile.custom_tdee,
    );
  }, [profile?.weight_kg, profile?.height_cm, profile?.age, profile?.activity_level, profile?.goal, profile?.gender, profile?.body_fat_pct, profile?.workout_burn, profile?.workout_deficit, profile?.custom_tdee]);

  // Auto-update daily targets whenever suggestions change
  useEffect(() => {
    if (!suggestion || !restSuggestion || !profile) return;
    setProfile(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        target_calories: suggestion.calories,
        target_protein_g: suggestion.protein_g,
        target_carbs_g: suggestion.carbs_g,
        target_fat_g: suggestion.fat_g,
        target_fiber_g: suggestion.fiber_g,
        target_sodium_mg: suggestion.sodium_mg,
        rest_target_calories: restSuggestion.calories,
        rest_target_protein_g: restSuggestion.protein_g,
        rest_target_carbs_g: restSuggestion.carbs_g,
        rest_target_fat_g: restSuggestion.fat_g,
        rest_target_fiber_g: restSuggestion.fiber_g,
        rest_target_sodium_mg: restSuggestion.sodium_mg,
      };
    });
  }, [suggestion, restSuggestion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          age: profile.age,
          weight_kg: profile.weight_kg,
          height_cm: profile.height_cm,
          activity_level: profile.activity_level,
          rest_activity_level: profile.rest_activity_level,
          workout_burn: profile.workout_burn,
          rest_deficit: profile.rest_deficit,
          workout_deficit: profile.workout_deficit,
          custom_tdee: profile.custom_tdee,
          goal: profile.goal,
          gender: profile.gender,
          body_fat_pct: profile.body_fat_pct,
          target_calories: profile.target_calories,
          target_protein_g: profile.target_protein_g,
          target_carbs_g: profile.target_carbs_g,
          target_fat_g: profile.target_fat_g,
          target_fiber_g: profile.target_fiber_g,
          target_sodium_mg: profile.target_sodium_mg,
          rest_target_calories: profile.rest_target_calories,
          rest_target_protein_g: profile.rest_target_protein_g,
          rest_target_carbs_g: profile.rest_target_carbs_g,
          rest_target_fat_g: profile.rest_target_fat_g,
          rest_target_fiber_g: profile.rest_target_fiber_g,
          rest_target_sodium_mg: profile.rest_target_sodium_mg,
        }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        showToast('Profile saved');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApplySuggestion = (type: 'training' | 'rest') => {
    const s = type === 'training' ? suggestion : restSuggestion;
    if (!s || !profile) return;
    if (type === 'training') {
      setProfile({
        ...profile,
        target_calories: s.calories,
        target_protein_g: s.protein_g,
        target_carbs_g: s.carbs_g,
        target_fat_g: s.fat_g,
        target_fiber_g: s.fiber_g,
        target_sodium_mg: s.sodium_mg,
      });
    } else {
      setProfile({
        ...profile,
        rest_target_calories: s.calories,
        rest_target_protein_g: s.protein_g,
        rest_target_carbs_g: s.carbs_g,
        rest_target_fat_g: s.fat_g,
        rest_target_fiber_g: s.fiber_g,
        rest_target_sodium_mg: s.sodium_mg,
      });
    }
    setCustomizing(false);
    showToast(`${type === 'training' ? 'Workout' : 'Rest'} day targets applied — save to keep them`);
  };

  const handleApplyBoth = () => {
    if (!suggestion || !restSuggestion || !profile) return;
    setProfile({
      ...profile,
      target_calories: suggestion.calories,
      target_protein_g: suggestion.protein_g,
      target_carbs_g: suggestion.carbs_g,
      target_fat_g: suggestion.fat_g,
      target_fiber_g: suggestion.fiber_g,
      target_sodium_mg: suggestion.sodium_mg,
      rest_target_calories: restSuggestion.calories,
      rest_target_protein_g: restSuggestion.protein_g,
      rest_target_carbs_g: restSuggestion.carbs_g,
      rest_target_fat_g: restSuggestion.fat_g,
      rest_target_fiber_g: restSuggestion.fiber_g,
      rest_target_sodium_mg: restSuggestion.sodium_mg,
    });
    setCustomizing(false);
    showToast('Both workout & rest day targets applied — save to keep them');
  };

  const handleLogWeight = async () => {
    const raw = parseFloat(weightInput);
    if (!raw) return;
    const w = weightUnit === 'lbs' ? lbsToKg(raw) : raw;
    if (w < 20 || w > 300) return;
    const wRes = await fetch('/api/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight_kg: w, logged_date: new Date().toISOString().slice(0, 10) }),
    });
    if (wRes.status === 401) { window.location.href = '/login'; return; }
    setProfile(prev => prev ? { ...prev, weight_kg: w } : prev);
    setWeightInput('');
    showToast('Weight logged');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Body composition derived values
  const leanMass = profile?.weight_kg && profile?.body_fat_pct
    ? Math.round(profile.weight_kg * (1 - profile.body_fat_pct / 100) * 10) / 10
    : null;
  const fatMass = profile?.weight_kg && profile?.body_fat_pct
    ? Math.round(profile.weight_kg * (profile.body_fat_pct / 100) * 10) / 10
    : null;

  if (loading) return (
    <>
      <Header title="Profile" date={date} onDateChange={setDate} />
      <div className="page-container">
        <div className="card"><div className="loading-shimmer" style={{ height: 400 }} /></div>
      </div>
    </>
  );

  if (!profile) return null;

  const canGenerateSuggestion = !!(profile.weight_kg && profile.height_cm && profile.age);

  return (
    <>
      <Header title="Profile" date={date} onDateChange={setDate} />
      <div className="page-container">
        <div className="profile-grid">

          {/* ── LEFT COLUMN ─────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Personal Info */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Personal Info</div>
              </div>

              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input type="number" className="form-input" value={profile.age || ''}
                    onChange={e => setProfile({ ...profile, age: parseInt(e.target.value) || null })}
                    min="10" max="120" />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={profile.gender || 'neutral'}
                    onChange={e => setProfile({ ...profile, gender: e.target.value })}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="neutral">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                {/* Weight with inline unit toggle */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Weight</label>
                    <UnitToggle options={['kg', 'lbs']} value={weightUnit} onChange={v => setWeightUnit(v as 'kg' | 'lbs')} />
                  </div>
                  <input type="number" className="form-input" value={displayWeight}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (!val) { setProfile({ ...profile, weight_kg: null }); return; }
                      setProfile({ ...profile, weight_kg: weightUnit === 'lbs' ? lbsToKg(val) : val });
                    }}
                    min={weightUnit === 'lbs' ? 44 : 20}
                    max={weightUnit === 'lbs' ? 660 : 300}
                    step="0.1" placeholder={weightUnit === 'kg' ? 'e.g. 75' : 'e.g. 165'} />
                </div>

                {/* Height with inline unit toggle */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Height</label>
                    <UnitToggle options={['cm', 'ft']} value={heightUnit} onChange={v => setHeightUnit(v as 'cm' | 'ft')} />
                  </div>
                  {heightUnit === 'cm' ? (
                    <input type="number" className="form-input" value={displayHeightCm}
                      onChange={e => setProfile({ ...profile, height_cm: parseFloat(e.target.value) || null })}
                      min="100" max="250" step="0.1" placeholder="e.g. 175" />
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" className="form-input" value={displayHeightFtIn.feet}
                        onChange={e => {
                          const ft = parseInt(e.target.value) || 0;
                          const ins = typeof displayHeightFtIn.inches === 'number' ? displayHeightFtIn.inches : 0;
                          setProfile({ ...profile, height_cm: ftInToCm(ft, ins) });
                        }}
                        min="3" max="8" placeholder="ft" />
                      <input type="number" className="form-input" value={displayHeightFtIn.inches}
                        onChange={e => {
                          const ins = parseInt(e.target.value) || 0;
                          const ft = typeof displayHeightFtIn.feet === 'number' ? displayHeightFtIn.feet : 0;
                          setProfile({ ...profile, height_cm: ftInToCm(ft, ins) });
                        }}
                        min="0" max="11" placeholder="in" />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Goal</label>
                  <select className="form-select" value={profile.goal}
                    onChange={e => setProfile({ ...profile, goal: e.target.value })}>
                    {Object.entries(GOAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Daily Activity (without workouts)</label>
                  <select className="form-select" value={profile.activity_level}
                    onChange={e => setProfile({ ...profile, activity_level: e.target.value })}>
                    {Object.entries(BASE_ACTIVITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Maintenance Calories (optional)</label>
                <input type="number" className="form-input"
                  value={profile.custom_tdee ?? ''}
                  onChange={e => {
                    const v = parseInt(e.target.value);
                    setProfile({ ...profile, custom_tdee: isNaN(v) ? null : v });
                  }}
                  min="1000" max="6000" step="50" placeholder={
                    restSuggestion ? `Computed: ${restSuggestion.tdee - (restSuggestion.tdee === (profile.custom_tdee ?? 0) ? 0 : 0)} — leave blank to auto-calculate` : 'e.g. 2500'
                  } />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Your daily calorie burn WITHOUT exercise. Get this from Apple Health, a fitness tracker, or leave blank to compute from BMR × activity level.
                  {restSuggestion && !profile.custom_tdee && (
                    <span> Currently computed: <strong>{restSuggestion.tdee} kcal</strong></span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Workout Calorie Burn (per session)</label>
                <input type="number" className="form-input"
                  value={profile.workout_burn ?? 400}
                  onChange={e => setProfile({ ...profile, workout_burn: parseInt(e.target.value) || 0 })}
                  min="0" max="1500" step="50" placeholder="e.g. 400" />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Estimated calories burned during a workout. Check your watch or use ~300 light, ~400 moderate, ~600 intense.
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Workout Day Deficit (kcal)</label>
                  <input type="number" className="form-input"
                    value={profile.workout_deficit ?? -500}
                    onChange={e => setProfile({ ...profile, workout_deficit: parseInt(e.target.value) || 0 })}
                    min="-1500" max="500" step="50" />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {(profile.workout_deficit ?? -500) < 0
                      ? `Eating ${Math.abs(profile.workout_deficit ?? 500)} below TDEE`
                      : (profile.workout_deficit ?? 0) > 0
                      ? `Eating ${profile.workout_deficit} above TDEE`
                      : 'Eating at maintenance'}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Rest Day Deficit (kcal)</label>
                  <input type="number" className="form-input"
                    value={profile.rest_deficit ?? -500}
                    onChange={e => setProfile({ ...profile, rest_deficit: parseInt(e.target.value) || 0 })}
                    min="-1500" max="500" step="50" />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {(profile.rest_deficit ?? -500) < 0
                      ? `Eating ${Math.abs(profile.rest_deficit ?? 500)} below TDEE`
                      : (profile.rest_deficit ?? 0) > 0
                      ? `Eating ${profile.rest_deficit} above TDEE`
                      : 'Eating at maintenance'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>

            {/* Body Composition */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Body Composition</div>
                <div className="card-subtitle">Used for more accurate protein targets</div>
              </div>

              <div className="form-group">
                <label className="form-label">Body Fat % (optional)</label>
                <input type="number" className="form-input"
                  value={profile.body_fat_pct || ''}
                  onChange={e => setProfile({ ...profile, body_fat_pct: parseFloat(e.target.value) || null })}
                  min="3" max="60" step="0.5"
                  placeholder="e.g. 18" />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Estimate using a DEXA scan, calipers, or an online calculator.
                </div>
              </div>

              {/* BMR display */}
              {restSuggestion && (
                <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Basal Metabolic Rate (BMR)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Calories your body burns at complete rest</div>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-calories)' }}>
                    {restSuggestion.bmr} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>kcal</span>
                  </div>
                </div>
              )}

              {/* Lean / Fat mass breakdown */}
              {profile.weight_kg && profile.body_fat_pct && leanMass && fatMass ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '8px', textAlign: 'center' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700 }}>{profile.weight_kg} kg</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-protein)' }}>{leanMass} kg</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Lean Mass</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-fat)' }}>{fatMass} kg</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fat Mass</div>
                    </div>
                  </div>

                  {/* Visual fat/lean bar */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <span>Lean {(100 - profile.body_fat_pct).toFixed(1)}%</span>
                      <span>Fat {profile.body_fat_pct}%</span>
                    </div>
                    <div style={{ height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${100 - profile.body_fat_pct}%`, background: 'var(--color-protein)', transition: 'width 0.4s' }} />
                      <div style={{ width: `${profile.body_fat_pct}%`, background: 'var(--color-fat)', transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-protein)', display: 'inline-block' }} />
                        Lean mass
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-fat)', display: 'inline-block' }} />
                        Fat mass
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Enter weight + body fat % to see your lean/fat breakdown
                </div>
              )}
            </div>

            {/* Weight Logger */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Log Weight</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Weight</label>
                    <UnitToggle options={['kg', 'lbs']} value={weightUnit} onChange={v => setWeightUnit(v as 'kg' | 'lbs')} />
                  </div>
                  <input type="number" className="form-input" value={weightInput}
                    onChange={e => setWeightInput(e.target.value)}
                    placeholder={profile.weight_kg
                      ? `Current: ${weightUnit === 'lbs' ? kgToLbs(profile.weight_kg) + ' lbs' : profile.weight_kg + ' kg'}`
                      : 'Enter weight'}
                    min={weightUnit === 'lbs' ? 44 : 20}
                    max={weightUnit === 'lbs' ? 660 : 300}
                    step="0.1" />
                </div>
                <button className="btn btn-primary" onClick={handleLogWeight} style={{ marginBottom: 0, height: 42 }}>Log</button>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Smart Recommendations — side-by-side Training vs Rest */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Smart Recommendations</div>
                  <div className="card-subtitle">
                    {canGenerateSuggestion
                      ? `Training vs rest day targets for: ${GOAL_LABELS[profile.goal as Goal]}`
                      : 'Fill in age, weight & height to get recommendations'}
                  </div>
                </div>
              </div>

              {!canGenerateSuggestion ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  Add your age, weight, and height on the left to see personalized recommendations.
                </div>
              ) : suggestion && restSuggestion ? (
                <>
                  {/* Side-by-side TDEE cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    {[
                      { label: `🏋️ Workout Day (+${profile.workout_burn ?? 400} cal)`, s: suggestion, color: 'var(--accent-indigo)', border: 'rgba(99,102,241,0.3)' },
                      { label: '😴 Rest Day (no workout)', s: restSuggestion, color: '#8b5cf6', border: 'rgba(139,92,246,0.3)' },
                    ].map(({ label, s, color, border }) => (
                      <div key={label} style={{ border: `1px solid ${border}`, borderRadius: 'var(--radius-sm)', padding: '14px', background: 'var(--bg-elevated)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color }}>{label}</div>

                        {/* TDEE − deficit = Eat this */}
                        <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border-primary)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>TDEE (you burn)</span>
                            <span style={{ fontWeight: 700 }}>{s.tdee} kcal</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border-primary)' }}>
                            <span style={{ color: s.tdee - s.calories > 0 ? '#10b981' : '#ff8c42' }}>
                              {s.tdee - s.calories > 0 ? 'Deficit' : s.tdee - s.calories < 0 ? 'Surplus' : 'No change'}
                            </span>
                            <span style={{ fontWeight: 700, color: s.tdee - s.calories > 0 ? '#10b981' : '#ff8c42' }}>
                              {s.tdee - s.calories > 0 ? `−${s.tdee - s.calories}` : s.tdee - s.calories < 0 ? `+${Math.abs(s.tdee - s.calories)}` : '0'} kcal
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                            <span style={{ fontWeight: 700, color }}>You eat</span>
                            <span style={{ fontWeight: 800, fontSize: '16px', color }}>{s.calories} kcal</span>
                          </div>
                        </div>

                        {/* Macro grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                          {[
                            { l: 'Protein', v: s.protein_g, u: 'g', c: 'var(--color-protein)' },
                            { l: 'Carbs', v: s.carbs_g, u: 'g', c: 'var(--color-carbs)' },
                            { l: 'Fat', v: s.fat_g, u: 'g', c: 'var(--color-fat)' },
                            { l: 'Sodium', v: s.sodium_mg, u: 'mg', c: 'var(--text-muted)' },
                          ].map(m => (
                            <div key={m.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{m.l}</span>
                              <span style={{ fontWeight: 600, color: m.c }}>{m.v}{m.u}</span>
                            </div>
                          ))}
                        </div>

                        {/* Deficit info */}
                        <div style={{ marginTop: '8px', padding: '6px 8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-muted)' }}>
                          {s.tdee - s.calories > 0
                            ? `${s.tdee - s.calories} kcal deficit`
                            : s.tdee - s.calories < 0
                            ? `${Math.abs(s.tdee - s.calories)} kcal surplus`
                            : 'At maintenance'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calorie difference between days */}
                  <div style={{
                    padding: '10px 14px', marginBottom: '12px',
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--accent-indigo)',
                  }}>
                    Workout days: {suggestion.calories} kcal · Rest days: {restSuggestion.calories} kcal · Difference: {suggestion.calories - restSuggestion.calories} kcal/day
                  </div>

                  {/* Rate message */}
                  <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--accent-indigo)', marginBottom: '16px' }}>
                    {suggestion.rate_message}
                  </div>

                  {/* Tips */}
                  {suggestion.tips.map((tip, i) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      💡 {tip}
                    </div>
                  ))}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleApplyBoth}>
                      Apply Both Targets
                    </button>
                    <button className="btn btn-secondary" onClick={() => setCustomizing(c => !c)}>
                      {customizing ? 'Hide' : 'Customize'}
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            {/* Daily Targets — Training + Rest side by side */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Daily Targets</div>
                <div className="card-subtitle">
                  {customizing ? 'Customized — edit freely' : 'Set from recommendations or manually'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Training day targets */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--accent-indigo)' }}>🏋️ Workout Day</div>
                  <div className="form-group">
                    <label className="form-label">Calories</label>
                    <input type="number" className="form-input" value={profile.target_calories}
                      onChange={e => setProfile({ ...profile, target_calories: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--color-protein)' }}>Protein (g)</label>
                    <input type="number" className="form-input" value={profile.target_protein_g}
                      onChange={e => setProfile({ ...profile, target_protein_g: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--color-carbs)' }}>Carbs (g)</label>
                    <input type="number" className="form-input" value={profile.target_carbs_g}
                      onChange={e => setProfile({ ...profile, target_carbs_g: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--color-fat)' }}>Fat (g)</label>
                    <input type="number" className="form-input" value={profile.target_fat_g}
                      onChange={e => setProfile({ ...profile, target_fat_g: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fiber (g)</label>
                    <input type="number" className="form-input" value={profile.target_fiber_g}
                      onChange={e => setProfile({ ...profile, target_fiber_g: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sodium (mg)</label>
                    <input type="number" className="form-input" value={profile.target_sodium_mg}
                      onChange={e => setProfile({ ...profile, target_sodium_mg: parseInt(e.target.value) || 0 })} />
                  </div>
                  <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}
                    onClick={() => handleApplySuggestion('training')} disabled={!suggestion}>
                    Apply Suggested
                  </button>
                </div>

                {/* Rest day targets */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: '#8b5cf6' }}>😴 Rest Day</div>
                  <div className="form-group">
                    <label className="form-label">Calories</label>
                    <input type="number" className="form-input" value={profile.rest_target_calories}
                      onChange={e => setProfile({ ...profile, rest_target_calories: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--color-protein)' }}>Protein (g)</label>
                    <input type="number" className="form-input" value={profile.rest_target_protein_g}
                      onChange={e => setProfile({ ...profile, rest_target_protein_g: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--color-carbs)' }}>Carbs (g)</label>
                    <input type="number" className="form-input" value={profile.rest_target_carbs_g}
                      onChange={e => setProfile({ ...profile, rest_target_carbs_g: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--color-fat)' }}>Fat (g)</label>
                    <input type="number" className="form-input" value={profile.rest_target_fat_g}
                      onChange={e => setProfile({ ...profile, rest_target_fat_g: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fiber (g)</label>
                    <input type="number" className="form-input" value={profile.rest_target_fiber_g}
                      onChange={e => setProfile({ ...profile, rest_target_fiber_g: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sodium (mg)</label>
                    <input type="number" className="form-input" value={profile.rest_target_sodium_mg}
                      onChange={e => setProfile({ ...profile, rest_target_sodium_mg: parseInt(e.target.value) || 0 })} />
                  </div>
                  <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}
                    onClick={() => handleApplySuggestion('rest')} disabled={!restSuggestion}>
                    Apply Suggested
                  </button>
                </div>
              </div>

              {/* Macro % preview for both */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                {[
                  { label: 'Workout', cal: profile.target_calories, p: profile.target_protein_g, c: profile.target_carbs_g, f: profile.target_fat_g },
                  { label: 'Rest', cal: profile.rest_target_calories, p: profile.rest_target_protein_g, c: profile.rest_target_carbs_g, f: profile.rest_target_fat_g },
                ].map(d => (
                  <div key={d.label} style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-around', textAlign: 'center', fontSize: '12px' }}>
                    {[
                      { l: 'P', v: Math.round((d.p * 4) / (d.cal || 1) * 100), c: 'var(--color-protein)' },
                      { l: 'C', v: Math.round((d.c * 4) / (d.cal || 1) * 100), c: 'var(--color-carbs)' },
                      { l: 'F', v: Math.round((d.f * 9) / (d.cal || 1) * 100), c: 'var(--color-fat)' },
                    ].map(m => (
                      <div key={m.l}>
                        <div style={{ fontWeight: 700, color: m.c, fontSize: '15px' }}>{m.v}%</div>
                        <div style={{ color: 'var(--text-muted)' }}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}
                style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}>
                {saving ? 'Saving...' : 'Save All Targets'}
              </button>
            </div>
          </div>
        </div>

        {toast && <div className="toast success">✅ {toast}</div>}
      </div>
    </>
  );
}
