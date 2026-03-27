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

interface Combo {
  id: number;
  name: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  items: { food_item_id: number; servings: number; name: string }[];
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
                    value={(form as Record<string, string | number>)[field]}
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
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFood, setEditingFood] = useState<FoodItem | null | 'new'>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showComboCreate, setShowComboCreate] = useState(false);
  const [comboName, setComboName] = useState('');
  const [comboSearch, setComboSearch] = useState('');
  const [comboSearchResults, setComboSearchResults] = useState<FoodItem[]>([]);
  const [comboItems, setComboItems] = useState<{ food_item_id: number; name: string; servings: number; calories: number; protein_g: number; carbs_g: number; fat_g: number }[]>([]);
  const [deleteComboConfirm, setDeleteComboConfirm] = useState<number | null>(null);
  const [editingComboId, setEditingComboId] = useState<number | null>(null);
  const [editComboName, setEditComboName] = useState('');
  const [editComboItems, setEditComboItems] = useState<{ food_item_id: number; name: string; servings: number; calories: number; protein_g: number; carbs_g: number; fat_g: number }[]>([]);
  const [editComboSearch, setEditComboSearch] = useState('');
  const [editComboSearchResults, setEditComboSearchResults] = useState<FoodItem[]>([]);

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

      const [customData, favData, comboData] = await Promise.all([
        fetch('/api/my-foods').then(r => r.json()),
        favRes.json(),
        fetch('/api/combos').then(r => r.json()),
      ]);
      if (customData.success) setCustomFoods(customData.data);
      if (favData.success) setFavorites(favData.data);
      if (comboData.success) setCombos(comboData.data);
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

  const handleComboSearch = async (query: string) => {
    setComboSearch(query);
    if (query.length < 2) { setComboSearchResults([]); return; }
    try {
      const res = await fetch(`/api/foods?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) setComboSearchResults(data.data);
    } catch {}
  };

  const handleAddComboItem = (food: FoodItem) => {
    if (comboItems.some(i => i.food_item_id === food.id)) return;
    setComboItems(prev => [...prev, {
      food_item_id: food.id,
      name: food.name,
      servings: 1,
      calories: food.calories,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
    }]);
    setComboSearch('');
    setComboSearchResults([]);
  };

  const handleCreateCombo = async () => {
    if (!comboName.trim() || comboItems.length < 2) return;
    await fetch('/api/combos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: comboName, items: comboItems.map(i => ({ food_item_id: i.food_item_id, servings: i.servings })) }),
    });
    setShowComboCreate(false);
    setComboName('');
    setComboItems([]);
    loadData();
  };

  const handleEditComboSearch = async (query: string) => {
    setEditComboSearch(query);
    if (query.length < 2) { setEditComboSearchResults([]); return; }
    try {
      const res = await fetch(`/api/foods?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) setEditComboSearchResults(data.data);
    } catch {}
  };

  const startEditCombo = (combo: Combo) => {
    setEditingComboId(combo.id);
    setEditComboName(combo.name);
    setEditComboItems(combo.items.map(i => ({
      food_item_id: i.food_item_id,
      name: i.name,
      servings: i.servings,
      calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
    })));
    setEditComboSearch('');
    setEditComboSearchResults([]);
  };

  const handleSaveCombo = async () => {
    if (!editingComboId || !editComboName.trim() || editComboItems.length < 2) return;
    await fetch('/api/combos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingComboId,
        name: editComboName,
        items: editComboItems.map(i => ({ food_item_id: i.food_item_id, servings: i.servings })),
      }),
    });
    setEditingComboId(null);
    loadData();
  };

  const handleDeleteCombo = async (id: number) => {
    await fetch(`/api/combos?id=${id}`, { method: 'DELETE' });
    setDeleteComboConfirm(null);
    loadData();
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'custom', label: 'Custom Foods', count: customFoods.length },
    { key: 'favorites', label: 'Favorites', count: favorites.length },
    { key: 'combos', label: 'Combos', count: combos.length },
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
            /* Combos tab */
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Groups of items you eat together — logs each item separately
                </div>
                <button className="btn btn-primary" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={() => setShowComboCreate(true)}>
                  + New Combo
                </button>
              </div>

              {/* Create combo form */}
              {showComboCreate && (
                <div style={{
                  padding: '16px', marginBottom: '16px',
                  background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-primary)',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Create Combo</div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Combo Name</label>
                    <input className="form-input" placeholder="e.g. Wiley rice + guac + salsa" value={comboName} onChange={e => setComboName(e.target.value)} />
                  </div>

                  {/* Added items */}
                  {comboItems.length > 0 && (
                    <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {comboItems.map((item, i) => (
                        <div key={item.food_item_id} style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
                          background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', fontSize: '13px',
                        }}>
                          <span style={{ flex: 1, fontWeight: 600 }}>{item.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {Math.round(item.calories * item.servings)} cal · {Math.round(item.protein_g * item.servings)}p
                          </span>
                          <input
                            type="number" min="0.25" step="0.25"
                            value={item.servings}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 1;
                              setComboItems(prev => prev.map((it, j) => j === i ? { ...it, servings: val } : it));
                            }}
                            style={{ width: '55px', fontSize: '12px', padding: '3px 6px', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--border-primary)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                          />
                          <button onClick={() => setComboItems(prev => prev.filter((_, j) => j !== i))} style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px', padding: '0 4px',
                          }}>✕</button>
                        </div>
                      ))}
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Total: {Math.round(comboItems.reduce((s, i) => s + i.calories * i.servings, 0))} cal
                        · {Math.round(comboItems.reduce((s, i) => s + i.protein_g * i.servings, 0))}g P
                        · {Math.round(comboItems.reduce((s, i) => s + i.carbs_g * i.servings, 0))}g C
                        · {Math.round(comboItems.reduce((s, i) => s + i.fat_g * i.servings, 0))}g F
                      </div>
                    </div>
                  )}

                  {/* Search to add items */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Add Foods</label>
                    <input className="form-input" placeholder="Search for a food to add..." value={comboSearch} onChange={e => handleComboSearch(e.target.value)} style={{ fontSize: '13px' }} />
                    {comboSearchResults.length > 0 && (
                      <div style={{ maxHeight: '150px', overflow: 'auto', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {comboSearchResults.slice(0, 8).map((food) => (
                          <div key={food.id} onClick={() => handleAddComboItem(food)} style={{
                            padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'var(--bg-card)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                          >
                            <div>
                              <span style={{ fontWeight: 600 }}>{food.name}</span>
                              {food.brand && <span style={{ color: 'var(--text-muted)' }}> · {food.brand}</span>}
                            </div>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{Math.round(food.calories)} cal · {Math.round(food.protein_g)}p</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '12px' }} onClick={() => { setShowComboCreate(false); setComboName(''); setComboItems([]); setComboSearch(''); setComboSearchResults([]); }}>Cancel</button>
                    <button className="btn btn-primary" style={{ fontSize: '12px' }} disabled={!comboName.trim() || comboItems.length < 2} onClick={handleCreateCombo}>
                      Save Combo ({comboItems.length} items)
                    </button>
                  </div>
                </div>
              )}

              {/* Combo list */}
              {combos.length === 0 && !showComboCreate ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🍱</div>
                  <div style={{ fontSize: '14px', marginBottom: '4px' }}>No combos yet</div>
                  <div style={{ fontSize: '12px' }}>Save groups of items you eat together (e.g. rice + guac + salsa at Wiley).</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {combos.map(combo => {
                    const isEditing = editingComboId === combo.id;
                    return (
                      <div key={combo.id} style={{
                        padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                        border: isEditing ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      }}>
                        {isEditing ? (
                          /* ── Edit mode ── */
                          <>
                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Combo Name</label>
                              <input className="form-input" value={editComboName} onChange={e => setEditComboName(e.target.value)} style={{ fontSize: '13px' }} />
                            </div>

                            {/* Edit items */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                              {editComboItems.map((item, i) => (
                                <div key={item.food_item_id} style={{
                                  display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
                                  background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', fontSize: '13px',
                                }}>
                                  <span style={{ flex: 1, fontWeight: 600 }}>{item.name}</span>
                                  <input
                                    type="number" min="0.25" step="0.25"
                                    value={item.servings}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 1;
                                      setEditComboItems(prev => prev.map((it, j) => j === i ? { ...it, servings: val } : it));
                                    }}
                                    style={{ width: '55px', fontSize: '12px', padding: '3px 6px', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--border-primary)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                                  />
                                  <button onClick={() => setEditComboItems(prev => prev.filter((_, j) => j !== i))} style={{
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px', padding: '0 4px',
                                  }}>✕</button>
                                </div>
                              ))}
                            </div>

                            {/* Search to add more items */}
                            <div style={{ marginBottom: '12px' }}>
                              <input className="form-input" placeholder="Search to add a food..." value={editComboSearch} onChange={e => handleEditComboSearch(e.target.value)} style={{ fontSize: '13px' }} />
                              {editComboSearchResults.length > 0 && (
                                <div style={{ maxHeight: '120px', overflow: 'auto', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {editComboSearchResults.slice(0, 6).map((food) => (
                                    <div key={food.id} onClick={() => {
                                      if (!editComboItems.some(i => i.food_item_id === food.id)) {
                                        setEditComboItems(prev => [...prev, { food_item_id: food.id, name: food.name, servings: 1, calories: food.calories, protein_g: food.protein_g, carbs_g: food.carbs_g, fat_g: food.fat_g }]);
                                      }
                                      setEditComboSearch(''); setEditComboSearchResults([]);
                                    }} style={{
                                      padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                      fontSize: '12px', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-card)',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                                    >
                                      <span style={{ fontWeight: 600 }}>{food.name}</span>
                                      <span style={{ color: 'var(--text-muted)' }}>{Math.round(food.calories)} cal</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button className="btn btn-secondary" style={{ fontSize: '11px' }} onClick={() => setEditingComboId(null)}>Cancel</button>
                              <button className="btn btn-primary" style={{ fontSize: '11px' }} disabled={!editComboName.trim() || editComboItems.length < 2} onClick={handleSaveCombo}>Save</button>
                            </div>
                          </>
                        ) : (
                          /* ── View mode ── */
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 700, cursor: 'pointer' }} onClick={() => startEditCombo(combo)} title="Click to edit">{combo.name}</div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => startEditCombo(combo)} style={{
                                  padding: '4px 10px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)',
                                  background: 'none', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer',
                                }}>Edit</button>
                                {deleteComboConfirm === combo.id ? (
                                  <button onClick={() => handleDeleteCombo(combo.id)} style={{
                                    padding: '4px 10px', border: 'none', borderRadius: 'var(--radius-sm)',
                                    background: '#ff4444', color: 'white', fontSize: '11px', cursor: 'pointer',
                                  }}>Confirm</button>
                                ) : (
                                  <button onClick={() => setDeleteComboConfirm(combo.id)} style={{
                                    padding: '4px 10px', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 'var(--radius-sm)',
                                    background: 'none', color: '#ff4444', fontSize: '11px', cursor: 'pointer',
                                  }}>Delete</button>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '8px' }}>
                              {combo.items.map((item, i) => (
                                <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                  <span>•</span>
                                  <span>{item.name}</span>
                                  {item.servings !== 1 && <span style={{ color: 'var(--text-muted)' }}>×{item.servings}</span>}
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: 'rgba(255,107,107,0.15)', color: '#ff6b6b' }}>{combo.total_calories} cal</span>
                              <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: 'rgba(78,205,196,0.15)', color: '#4ecdc4' }}>{combo.total_protein_g}g P</span>
                              <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: 'rgba(255,209,102,0.15)', color: '#ffd166' }}>{combo.total_carbs_g}g C</span>
                              <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', background: 'rgba(168,130,255,0.15)', color: '#a882ff' }}>{combo.total_fat_g}g F</span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
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
