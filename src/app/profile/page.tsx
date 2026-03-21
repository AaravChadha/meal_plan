'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { calculateTDEE, recommendMacros, ACTIVITY_LABELS, GOAL_LABELS } from '@/lib/tdee';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  activity_level: string;
  goal: string;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_fiber_g: number;
  target_sodium_mg: number;
}

export default function ProfilePage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile?user_id=1');
        const data = await res.json();
        if (data.success) setProfile(data.data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          name: profile.name,
          age: profile.age,
          weight_kg: profile.weight_kg,
          height_cm: profile.height_cm,
          activity_level: profile.activity_level,
          goal: profile.goal,
          target_calories: profile.target_calories,
          target_protein_g: profile.target_protein_g,
          target_carbs_g: profile.target_carbs_g,
          target_fat_g: profile.target_fat_g,
          target_fiber_g: profile.target_fiber_g,
          target_sodium_mg: profile.target_sodium_mg,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        showToast('Profile saved successfully');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCalculateTDEE = () => {
    if (!profile?.weight_kg || !profile?.height_cm || !profile?.age) return;

    const result = calculateTDEE(
      profile.weight_kg,
      profile.height_cm,
      profile.age,
      profile.activity_level as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
      profile.goal as 'cut' | 'maintain' | 'bulk',
    );

    const macros = recommendMacros(
      result.adjusted,
      profile.goal as 'cut' | 'maintain' | 'bulk',
    );

    setProfile({
      ...profile,
      ...macros,
    });
  };

  const handleLogWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w < 20 || w > 300) return;

    try {
      await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 1,
          weight_kg: w,
          logged_date: new Date().toISOString().slice(0, 10),
        }),
      });
      setProfile(prev => prev ? { ...prev, weight_kg: w } : prev);
      setWeightInput('');
      showToast('Weight logged successfully');
    } catch (err) {
      console.error('Error logging weight:', err);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const tdeeResult = profile?.weight_kg && profile?.height_cm && profile?.age
    ? calculateTDEE(
        profile.weight_kg,
        profile.height_cm,
        profile.age,
        profile.activity_level as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
        profile.goal as 'cut' | 'maintain' | 'bulk',
      )
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

  return (
    <>
      <Header title="Profile" date={date} onDateChange={setDate} />
      <div className="page-container">
        <div className="profile-grid">
          {/* Personal Information */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Personal Information</div>
            </div>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.age || ''}
                  onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || null })}
                  min="10"
                  max="120"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.weight_kg || ''}
                  onChange={(e) => setProfile({ ...profile, weight_kg: parseFloat(e.target.value) || null })}
                  min="20"
                  max="300"
                  step="0.1"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Height (cm)</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.height_cm || ''}
                  onChange={(e) => setProfile({ ...profile, height_cm: parseFloat(e.target.value) || null })}
                  min="100"
                  max="250"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Activity Level</label>
                <select
                  className="form-select"
                  value={profile.activity_level}
                  onChange={(e) => setProfile({ ...profile, activity_level: e.target.value })}
                >
                  {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Goal</label>
              <select
                className="form-select"
                value={profile.goal}
                onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
              >
                {Object.entries(GOAL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn btn-secondary" onClick={handleCalculateTDEE}>
                Calculate TDEE & Recommendations
              </button>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

            {/* TDEE Display */}
            {tdeeResult && (
              <div className="tdee-display" style={{ marginTop: '24px' }}>
                <div className="tdee-value">{tdeeResult.adjusted}</div>
                <div className="tdee-label">Daily Calorie Target</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tdeeResult.bmr}</div>
                    <div>BMR</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tdeeResult.tdee}</div>
                    <div>TDEE</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-indigo)' }}>{tdeeResult.adjusted}</div>
                    <div>Adjusted</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nutrition Targets */}
          <div>
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <div className="card-title">Daily Targets</div>
              </div>
              <div className="form-group">
                <label className="form-label">Calories (kcal)</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.target_calories}
                  onChange={(e) => setProfile({ ...profile, target_calories: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Protein (g)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={profile.target_protein_g}
                    onChange={(e) => setProfile({ ...profile, target_protein_g: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Carbs (g)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={profile.target_carbs_g}
                    onChange={(e) => setProfile({ ...profile, target_carbs_g: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fat (g)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={profile.target_fat_g}
                    onChange={(e) => setProfile({ ...profile, target_fat_g: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fiber (g)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={profile.target_fiber_g}
                    onChange={(e) => setProfile({ ...profile, target_fiber_g: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Sodium Limit (mg)</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.target_sodium_mg}
                  onChange={(e) => setProfile({ ...profile, target_sodium_mg: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* Macro breakdown preview */}
              <div style={{
                marginTop: '16px', padding: '16px', background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-around',
                textAlign: 'center', fontSize: '13px'
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-protein)', fontSize: '18px' }}>
                    {Math.round((profile.target_protein_g * 4) / (profile.target_calories || 1) * 100)}%
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>Protein</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-carbs)', fontSize: '18px' }}>
                    {Math.round((profile.target_carbs_g * 4) / (profile.target_calories || 1) * 100)}%
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>Carbs</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-fat)', fontSize: '18px' }}>
                    {Math.round((profile.target_fat_g * 9) / (profile.target_calories || 1) * 100)}%
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>Fat</div>
                </div>
              </div>
            </div>

            {/* Weight Tracking */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Log Weight</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Weight (kg)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder={profile.weight_kg ? `Current: ${profile.weight_kg} kg` : 'Enter weight'}
                    min="20"
                    max="300"
                    step="0.1"
                  />
                </div>
                <button className="btn btn-primary" onClick={handleLogWeight} style={{ marginBottom: 0, height: 42 }}>
                  Log
                </button>
              </div>
              {profile.weight_kg && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{profile.weight_kg} kg</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Current weight</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="toast success">
            ✅ {toast}
          </div>
        )}
      </div>
    </>
  );
}
