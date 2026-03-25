'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import FoodSearch from '@/components/FoodSearch';

interface FoodResult {
  id: number | null;
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
  fdc_id?: string | null;
  source: string;
  category?: string | null;
}

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

const EMPTY_CUSTOM_FOOD = {
  name: '',
  brand: '',
  serving_size: 100,
  serving_unit: 'g',
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sugar_g: 0,
  sodium_mg: 0,
  cholesterol_mg: 0,
  saturated_fat_g: 0,
};

export default function FoodLogPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [servings, setServings] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customFood, setCustomFood] = useState({ ...EMPTY_CUSTOM_FOOD });
  const [toast, setToast] = useState<string | null>(null);

  const fetchMeals = useCallback(async () => {
    try {
      const res = await fetch(`/api/food-log?date=${date}`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await res.json();
      if (data.success) setMeals(data.data);
    } catch (err) {
      console.error('Error fetching meals:', err);
    }
  }, [date]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleFoodSelect = (food: FoodResult) => {
    setSelectedFood(food);
    setServings(1);
    setShowModal(true);
  };

  const handleAddFood = async () => {
    if (!selectedFood) return;

    try {
      let foodItemId = selectedFood.id;

      // If USDA food, save it locally first
      if (!foodItemId && selectedFood.source === 'usda') {
        const saveRes = await fetch('/api/foods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selectedFood),
        });
        if (saveRes.status === 401) { window.location.href = '/login'; return; }
        const saveData = await saveRes.json();
        if (saveData.success) {
          foodItemId = saveData.data.id;
        }
      }

      if (!foodItemId) return;

      const res = await fetch('/api/food-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_item_id: foodItemId,
          meal_type: selectedMealType,
          servings,
          logged_date: date,
        }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setSelectedFood(null);
        fetchMeals();
        showToastMsg(`Added ${selectedFood.name} to ${MEAL_LABELS[selectedMealType]}`);
      }
    } catch (err) {
      console.error('Error adding food:', err);
    }
  };

  const handleAddCustomFood = async () => {
    if (!customFood.name.trim()) return;

    try {
      // Save custom food to database
      const saveRes = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customFood,
          is_custom: 1,
          category: 'Custom',
        }),
      });
      if (saveRes.status === 401) { window.location.href = '/login'; return; }
      const saveData = await saveRes.json();
      if (!saveData.success) return;

      const foodItemId = saveData.data.id;

      // Log it to the current meal
      const res = await fetch('/api/food-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_item_id: foodItemId,
          meal_type: selectedMealType,
          servings: 1,
          logged_date: date,
        }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }

      const data = await res.json();
      if (data.success) {
        setShowCustomModal(false);
        setCustomFood({ ...EMPTY_CUSTOM_FOOD });
        fetchMeals();
        showToastMsg(`Added ${customFood.name} to ${MEAL_LABELS[selectedMealType]}`);
      }
    } catch (err) {
      console.error('Error adding custom food:', err);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    try {
      const delRes = await fetch(`/api/food-log?id=${id}`, { method: 'DELETE' });
      if (delRes.status === 401) { window.location.href = '/login'; return; }
      fetchMeals();
      showToastMsg('Entry removed');
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  const showToastMsg = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const updateCustomField = (field: string, value: string) => {
    const numFields = ['serving_size', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'cholesterol_mg', 'saturated_fat_g'];
    if (numFields.includes(field)) {
      setCustomFood(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    } else {
      setCustomFood(prev => ({ ...prev, [field]: value }));
    }
  };

  // Auto-calculate calories from macros
  const autoCalcCalories = () => {
    const cal = Math.round(customFood.protein_g * 4 + customFood.carbs_g * 4 + customFood.fat_g * 9);
    setCustomFood(prev => ({ ...prev, calories: cal }));
  };

  const mealGroups = ['breakfast', 'lunch', 'dinner', 'snack'].map((type) => ({
    type,
    entries: meals.filter((m) => m.meal_type === type),
    totalCal: meals.filter((m) => m.meal_type === type).reduce((sum, m) => sum + m.calories * m.servings, 0),
  }));

  return (
    <>
      <Header title="Food Log" date={date} onDateChange={setDate} />
      <div className="page-container">
        {/* Meal Type Selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="quick-add-row" style={{ marginBottom: 0 }}>
            {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
              <button
                key={type}
                className={`meal-type-btn ${selectedMealType === type ? 'selected' : ''}`}
                onClick={() => setSelectedMealType(type)}
              >
                {MEAL_ICONS[type]} {MEAL_LABELS[type]}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setCustomFood({ ...EMPTY_CUSTOM_FOOD });
              setShowCustomModal(true);
            }}
            style={{ gap: '6px' }}
          >
            ✏️ Create Custom Food
          </button>
        </div>

        {/* Food Search */}
        <FoodSearch onSelect={handleFoodSelect} />

        {/* Meal Entries */}
        <div className="meals-container">
          {mealGroups.map((group) => (
            <div key={group.type} className="meal-section">
              <div className="meal-header">
                <div className="meal-header-left">
                  <span className="meal-icon">{MEAL_ICONS[group.type]}</span>
                  <span className="meal-name">{MEAL_LABELS[group.type]}</span>
                </div>
                <span className="meal-calories">{Math.round(group.totalCal)} cal</span>
              </div>
              <div className="meal-items">
                {group.entries.length === 0 ? (
                  <div className="meal-empty">
                    No foods logged for {MEAL_LABELS[group.type].toLowerCase()} yet
                  </div>
                ) : (
                  group.entries.map((entry) => (
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
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Food Modal (from search) */}
        {showModal && selectedFood && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title">{selectedFood.name}</div>
              <div className="modal-subtitle">
                {selectedFood.brand ? `${selectedFood.brand} · ` : ''}
                per {selectedFood.serving_size}{selectedFood.serving_unit}
              </div>

              <div className="modal-food-preview">
                <div className="modal-food-stat">
                  <div className="modal-food-stat-value" style={{ color: 'var(--color-calories)' }}>
                    {Math.round(selectedFood.calories * servings)}
                  </div>
                  <div className="modal-food-stat-label">Calories</div>
                </div>
                <div className="modal-food-stat">
                  <div className="modal-food-stat-value" style={{ color: 'var(--color-protein)' }}>
                    {Math.round(selectedFood.protein_g * servings)}g
                  </div>
                  <div className="modal-food-stat-label">Protein</div>
                </div>
                <div className="modal-food-stat">
                  <div className="modal-food-stat-value" style={{ color: 'var(--color-carbs)' }}>
                    {Math.round(selectedFood.carbs_g * servings)}g
                  </div>
                  <div className="modal-food-stat-label">Carbs</div>
                </div>
                <div className="modal-food-stat">
                  <div className="modal-food-stat-value" style={{ color: 'var(--color-fat)' }}>
                    {Math.round(selectedFood.fat_g * servings)}g
                  </div>
                  <div className="modal-food-stat-label">Fat</div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Meal</label>
                  <select
                    className="form-select"
                    value={selectedMealType}
                    onChange={(e) => setSelectedMealType(e.target.value)}
                  >
                    <option value="breakfast">🌅 Breakfast</option>
                    <option value="lunch">☀️ Lunch</option>
                    <option value="dinner">🌙 Dinner</option>
                    <option value="snack">🍎 Snack</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Servings</label>
                  <input
                    type="number"
                    className="form-input"
                    value={servings}
                    onChange={(e) => setServings(Math.max(0.25, parseFloat(e.target.value) || 0.25))}
                    min="0.25"
                    step="0.25"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddFood}>
                  Add to {MEAL_LABELS[selectedMealType]}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Food Modal */}
        {showCustomModal && (
          <div className="modal-overlay" onClick={() => setShowCustomModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
              <div className="modal-title">✏️ Create Custom Food</div>
              <div className="modal-subtitle">Enter the food name and set the nutrition values yourself</div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Food Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Homemade Burger"
                    value={customFood.name}
                    onChange={(e) => updateCustomField('name', e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Brand (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Five Guys"
                    value={customFood.brand}
                    onChange={(e) => updateCustomField('brand', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Serving Size</label>
                  <input
                    type="number"
                    className="form-input"
                    value={customFood.serving_size}
                    onChange={(e) => updateCustomField('serving_size', e.target.value)}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Serving Unit</label>
                  <select
                    className="form-select"
                    value={customFood.serving_unit}
                    onChange={(e) => updateCustomField('serving_unit', e.target.value)}
                  >
                    <option value="g">grams (g)</option>
                    <option value="ml">milliliters (ml)</option>
                    <option value="oz">ounces (oz)</option>
                    <option value="cup">cup</option>
                    <option value="tbsp">tablespoon</option>
                    <option value="piece">piece</option>
                    <option value="serving">serving</option>
                    <option value="slice">slice</option>
                  </select>
                </div>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', marginTop: '8px', borderTop: '1px solid var(--border-primary)', paddingTop: '16px' }}>
                Macronutrients
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Calories (kcal)</label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={autoCalcCalories}
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    ⚡ Auto-calc from macros
                  </button>
                </div>
                <input
                  type="number"
                  className="form-input"
                  value={customFood.calories}
                  onChange={(e) => updateCustomField('calories', e.target.value)}
                  min="0"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--color-protein)' }}>Protein (g)</label>
                  <input type="number" className="form-input" value={customFood.protein_g} onChange={(e) => updateCustomField('protein_g', e.target.value)} min="0" step="0.1" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--color-carbs)' }}>Carbs (g)</label>
                  <input type="number" className="form-input" value={customFood.carbs_g} onChange={(e) => updateCustomField('carbs_g', e.target.value)} min="0" step="0.1" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--color-fat)' }}>Fat (g)</label>
                  <input type="number" className="form-input" value={customFood.fat_g} onChange={(e) => updateCustomField('fat_g', e.target.value)} min="0" step="0.1" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--color-fiber)' }}>Fiber (g)</label>
                  <input type="number" className="form-input" value={customFood.fiber_g} onChange={(e) => updateCustomField('fiber_g', e.target.value)} min="0" step="0.1" />
                </div>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', marginTop: '8px', borderTop: '1px solid var(--border-primary)', paddingTop: '16px' }}>
                Micronutrients (optional)
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sugar (g)</label>
                  <input type="number" className="form-input" value={customFood.sugar_g} onChange={(e) => updateCustomField('sugar_g', e.target.value)} min="0" step="0.1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sodium (mg)</label>
                  <input type="number" className="form-input" value={customFood.sodium_mg} onChange={(e) => updateCustomField('sodium_mg', e.target.value)} min="0" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cholesterol (mg)</label>
                  <input type="number" className="form-input" value={customFood.cholesterol_mg} onChange={(e) => updateCustomField('cholesterol_mg', e.target.value)} min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Saturated Fat (g)</label>
                  <input type="number" className="form-input" value={customFood.saturated_fat_g} onChange={(e) => updateCustomField('saturated_fat_g', e.target.value)} min="0" step="0.1" />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '16px', marginTop: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Add to Meal</label>
                  <select className="form-select" value={selectedMealType} onChange={(e) => setSelectedMealType(e.target.value)}>
                    <option value="breakfast">🌅 Breakfast</option>
                    <option value="lunch">☀️ Lunch</option>
                    <option value="dinner">🌙 Dinner</option>
                    <option value="snack">🍎 Snack</option>
                  </select>
                </div>
              </div>

              {customFood.name && (
                <div className="modal-food-preview" style={{ marginBottom: 0, marginTop: '8px' }}>
                  <div className="modal-food-stat">
                    <div className="modal-food-stat-value" style={{ color: 'var(--color-calories)' }}>{customFood.calories}</div>
                    <div className="modal-food-stat-label">Calories</div>
                  </div>
                  <div className="modal-food-stat">
                    <div className="modal-food-stat-value" style={{ color: 'var(--color-protein)' }}>{customFood.protein_g}g</div>
                    <div className="modal-food-stat-label">Protein</div>
                  </div>
                  <div className="modal-food-stat">
                    <div className="modal-food-stat-value" style={{ color: 'var(--color-carbs)' }}>{customFood.carbs_g}g</div>
                    <div className="modal-food-stat-label">Carbs</div>
                  </div>
                  <div className="modal-food-stat">
                    <div className="modal-food-stat-value" style={{ color: 'var(--color-fat)' }}>{customFood.fat_g}g</div>
                    <div className="modal-food-stat-label">Fat</div>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowCustomModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddCustomFood} disabled={!customFood.name.trim()}>
                  Save & Add to {MEAL_LABELS[selectedMealType]}
                </button>
              </div>
            </div>
          </div>
        )}

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
