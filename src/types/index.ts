// ── User ──────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'cut' | 'maintain' | 'bulk';
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_fiber_g: number;
  target_sodium_mg: number;
  created_at: string;
  updated_at: string;
}

// ── Food Item ─────────────────────────────────────────────────────
export interface FoodItem {
  id: number;
  name: string;
  brand: string | null;
  category: string | null;
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
  fdc_id: string | null;
  is_custom: number;
}

// ── Food Log Entry ────────────────────────────────────────────────
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLogEntry {
  id: number;
  user_id: number;
  food_item_id: number;
  meal_type: MealType;
  servings: number;
  logged_date: string;
  created_at: string;
}

export interface FoodLogEntryWithFood extends FoodLogEntry {
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

// ── Daily Summary ─────────────────────────────────────────────────
export interface DailySummary {
  date: string;
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
  meals: Record<MealType, FoodLogEntryWithFood[]>;
}

// ── Weight Log ────────────────────────────────────────────────────
export interface WeightLogEntry {
  id: number;
  user_id: number;
  weight_kg: number;
  logged_date: string;
}

// ── Nutrient Target Status ────────────────────────────────────────
export type NutrientStatus = 'low' | 'on_target' | 'high' | 'excessive';

export interface NutrientProgress {
  name: string;
  current: number;
  target: number;
  unit: string;
  percentage: number;
  status: NutrientStatus;
  isLimitType: boolean; // true for sodium, cholesterol (want to stay under)
}

// ── API Response Types ────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
