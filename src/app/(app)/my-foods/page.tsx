'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';

interface FoodItem {
  id: number;
  name: string;
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
  is_custom: number;
}

type Tab = 'custom' | 'favorites' | 'combos';

function MacroPills({ item }: { item: FoodItem }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: 'rgba(255,107,107,0.15)', color: '#ff6b6b' }}>
        {item.calories} cal
      </span>
      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: 'rgba(78,205,196,0.15)', color: '#4ecdc4' }}>
        {item.protein_g}g P
      </span>
      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: 'rgba(255,209,102,0.15)', color: '#ffd166' }}>
        {item.carbs_g}g C
      </span>
      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: 'rgba(168,130,255,0.15)', color: '#a882ff' }}>
        {item.fat_g}g F
      </span>
    </div>
  );
}

function EditFoodModal({ food, onSave, onClose }: {
  food: FoodItem | null;
  onSave: (data: Partial<FoodItem> & { id?: number }) => void;
  onClose: () => void;
}) {
  const isNew = !food;
  const [form, setForm] = useState({
    name: food?.name ?? '',
    brand: food?.brand ?? '',
    serving_size: food?.serving_size ?? 100,
    serving_unit: food?.serving_unit ?? 'g',
    calories: food?.calories ?? 0,
    protein_g: food?.protein_g ?? 0,
    carbs_g: food?.carbs_g ?? 0,
    fat_g: food?.fat_g ?? 0,
    fiber_g: food?.fiber_g ?? 0,
    sugar_g: food?.sugar_g ?? 0,
    sodium_mg: food?.sodium_mg ?? 0,
    cholesterol_mg: food?.cholesterol_mg ?? 0,
    saturated_fat_g: food?.saturated_fat_g ?? 0,
  });

  const handleNum = (field: string, val: string) => {
    setForm(f => ({ ...f, [field]: val === '' ? '' : parseFloat(val) || 0 }));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '24px',
        width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
          {isNew ? 'Create Custom Food' : 'Edit Food'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. My Protein Shake" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Brand</label>
              <input className="form-input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Serving Unit</label>
              <input className="form-input" value={form.serving_unit} onChange={e => setForm(f => ({ ...f, serving_unit: e.target.value }))} placeholder="g, ml, scoop..." />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-primary)', margin: '4px 0', paddingTop: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Nutrition (per serving)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Calories', field: 'calories', color: '#ff6b6b' },
                { label: 'Protein (g)', field: 'protein_g', color: '#4ecdc4' },
                { label: 'Carbs (g)', field: 'carbs_g', color: '#ffd166' },
                { label: 'Fat (g)', field: 'fat_g', color: '#a882ff' },
                { label: 'Fiber (g)', field: 'fiber_g', color: 'var(--text-muted)' },
                { label: 'Sodium (mg)', field: 'sodium_mg', color: 'var(--text-muted)' },
              ].map(({ label, field, color }) => (
                <div key={field}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color }}>{label}</label>
                  <input className="form-input" type="number" step="any" min="0"
                    value={(form as Record<string, unknown>)[field]}
                    onChange={e => handleNum(field, e.target.value)}
                    onBlur={e => { if (e.target.value === '') handleNum(field, '0'); }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.name.trim()} onClick={() => {
            onSave({ ...form, id: food?.id, calories: Number(form.calories), protein_g: Number(form.protein_g), carbs_g: Number(form.carbs_g), fat_g: Number(form.fat_g), fiber_g: Number(form.fiber_g), sugar_g: Number(form.sugar_g), sodium_mg: Number(form.sodium_mg), cholesterol_mg: Number(form.cholesterol_mg), saturated_fat_g: Number(form.saturated_fat_g) });
          }}>
            {isNew ? 'Create' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyFoodsPage() {
  const [tab, setTab] = useState<Tab>('custom');
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [favorites, setFavorites] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFood, setEditingFood] = useState<FoodItem | null | 'new'>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [customRes, favRes] = await Promise.all([
        fetch('/api/foods?q=_custom_all&source=local'),
        fetch('/api/foods/favorites'),
      ]);

      if (customRes.status === 401 || favRes.status === 401) {
        window.location.href = '/login';
        return;
      }

      // Custom foods: fetch all user's custom foods directly from DB
      const customData = await fetch('/api/my-foods').then(r => r.json());
      if (customData.success) setCustomFoods(customData.data);

      const favData = await favRes.json();
      if (favData.success) setFavorites(favData.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveFood = async (data: Partial<FoodItem> & { id?: number }) => {
    if (data.id) {
      await fetch('/api/foods', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    } else {
      await fetch('/api/foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, is_custom: 1 }) });
    }
    setEditingFood(null);
    loadData();
  };

  const handleDeleteFood = async (id: number) => {
    await fetch(`/api/foods?id=${id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    loadData();
  };

  const handleUnfavorite = async (foodItemId: number) => {
    await fetch(`/api/foods/favorites?food_item_id=${foodItemId}`, { method: 'DELETE' });
    loadData();
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'custom', label: 'Custom Foods', count: customFoods.length },
    { key: 'favorites', label: 'Favorites', count: favorites.length },
    { key: 'combos', label: 'Combos', count: 0 },
  ];

  return (
    <>
      <Header title="My Foods" />
      <div className="page-container">
        <div className="card">
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '4px' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: tab === t.key ? 700 : 400, fontSize: '13px', cursor: 'pointer',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s',
              }}>
                {t.label} {t.count > 0 && <span style={{ opacity: 0.6 }}>({t.count})</span>}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-shimmer" style={{ height: 200 }} />
          ) : tab === 'custom' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Foods you created — only visible to you
                </div>
                <button className="btn btn-primary" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={() => setEditingFood('new')}>
                  + New Food
                </button>
              </div>

              {customFoods.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🍽</div>
                  <div style={{ fontSize: '14px', marginBottom: '4px' }}>No custom foods yet</div>
                  <div style={{ fontSize: '12px' }}>Create foods you eat regularly — protein shakes, meal preps, etc.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {customFoods.map(food => (
                    <div key={food.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                          {food.name}
                          {food.brand && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px', fontSize: '12px' }}>{food.brand}</span>}
                        </div>
                        <MacroPills item={food} />
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          per {food.serving_size} {food.serving_unit}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => setEditingFood(food)} style={{
                          padding: '6px 10px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)',
                          background: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
                        }}>Edit</button>
                        {deleteConfirm === food.id ? (
                          <button onClick={() => handleDeleteFood(food.id)} style={{
                            padding: '6px 10px', border: 'none', borderRadius: 'var(--radius-sm)',
                            background: '#ff4444', color: 'white', fontSize: '12px', cursor: 'pointer',
                          }}>Confirm</button>
                        ) : (
                          <button onClick={() => setDeleteConfirm(food.id)} style={{
                            padding: '6px 10px', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 'var(--radius-sm)',
                            background: 'none', color: '#ff4444', fontSize: '12px', cursor: 'pointer',
                          }}>Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : tab === 'favorites' ? (
            <>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Starred foods from search — tap the star on any food to add it here
              </div>

              {favorites.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
                  <div style={{ fontSize: '14px', marginBottom: '4px' }}>No favorites yet</div>
                  <div style={{ fontSize: '12px' }}>Star foods in the Food Log search to save them here for quick access.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {favorites.map(food => (
                    <div key={food.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                          {food.name}
                          {food.brand && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px', fontSize: '12px' }}>{food.brand}</span>}
                        </div>
                        <MacroPills item={food} />
                      </div>
                      <button onClick={() => handleUnfavorite(food.id)} title="Remove from favorites" style={{
                        padding: '6px 10px', border: '1px solid rgba(255,209,102,0.3)', borderRadius: 'var(--radius-sm)',
                        background: 'none', color: '#ffd166', fontSize: '14px', cursor: 'pointer', flexShrink: 0,
                      }}>★</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Combos tab — placeholder */
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🍱</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}>Combos coming soon</div>
              <div style={{ fontSize: '12px' }}>Save groups of items you eat together (e.g. rice + guac + salsa at Wiley).</div>
            </div>
          )}
        </div>
      </div>

      {editingFood && (
        <EditFoodModal
          food={editingFood === 'new' ? null : editingFood}
          onSave={handleSaveFood}
          onClose={() => setEditingFood(null)}
        />
      )}
    </>
  );
}
