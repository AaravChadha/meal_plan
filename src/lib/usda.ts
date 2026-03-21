// ── USDA FoodData Central API Client ──────────────────────────────
// Free API — no key required (DEMO_KEY), 30 req/hr limit

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const API_KEY = 'DEMO_KEY';

interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface USDASearchFood {
  fdcId: number;
  description: string;
  brandName?: string;
  foodCategory?: string;
  foodNutrients: USDANutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
}

interface USDASearchResult {
  foods: USDASearchFood[];
  totalHits: number;
}

// USDA nutrient IDs for the nutrients we track
const NUTRIENT_IDS = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
  fiber: 1079,
  sugar: 2000,
  sodium: 1093,
  cholesterol: 1253,
  saturated_fat: 1258,
};

function extractNutrient(nutrients: USDANutrient[], nutrientId: number): number {
  const found = nutrients.find((n) => n.nutrientId === nutrientId);
  return found ? Math.round(found.value * 100) / 100 : 0;
}

export interface ParsedFood {
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
  fdc_id: string;
}

export async function searchUSDA(query: string, pageSize = 8): Promise<ParsedFood[]> {
  try {
    const url = `${BASE_URL}/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Foundation,SR%20Legacy,Branded`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!res.ok) {
      console.warn(`USDA API error: ${res.status}`);
      return [];
    }

    const data: USDASearchResult = await res.json();

    return data.foods.map((food) => ({
      name: food.description,
      brand: food.brandName || null,
      category: food.foodCategory || null,
      serving_size: food.servingSize || 100,
      serving_unit: food.servingSizeUnit?.toLowerCase() || 'g',
      calories: extractNutrient(food.foodNutrients, NUTRIENT_IDS.calories),
      protein_g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.protein),
      carbs_g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.carbs),
      fat_g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.fat),
      fiber_g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.fiber),
      sugar_g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.sugar),
      sodium_mg: extractNutrient(food.foodNutrients, NUTRIENT_IDS.sodium),
      cholesterol_mg: extractNutrient(food.foodNutrients, NUTRIENT_IDS.cholesterol),
      saturated_fat_g: extractNutrient(food.foodNutrients, NUTRIENT_IDS.saturated_fat),
      fdc_id: String(food.fdcId),
    }));
  } catch (err) {
    console.warn('USDA API search failed:', err);
    return [];
  }
}
