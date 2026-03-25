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

// ── Open Food Facts API Client ──────────────────────────────────
// Free, no key required, no enforced rate limit
// Best for branded/packaged foods (Chobani, Oikos, protein bars, etc.)

const OFF_BASE = 'https://world.openfoodfacts.net/cgi/search.pl';

export async function searchOpenFoodFacts(query: string, pageSize = 8): Promise<ParsedFood[]> {
  try {
    const url = `${OFF_BASE}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${pageSize}&fields=product_name,brands,nutriments,serving_size`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NutriTrack/1.0 (student project)' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`Open Food Facts API error: ${res.status}`);
      return [];
    }

    const data = await res.json();

    return (data.products || [])
      .filter((p: Record<string, unknown>) => p.product_name && p.nutriments)
      .map((p: Record<string, unknown>) => {
        const n = p.nutriments as Record<string, number>;
        // Parse serving size (e.g. "170 g" → 170)
        const servingStr = (p.serving_size as string) || '100 g';
        const servingMatch = servingStr.match(/(\d+\.?\d*)\s*(g|ml|oz)/i);
        const servingSize = servingMatch ? parseFloat(servingMatch[1]) : 100;
        const servingUnit = servingMatch ? servingMatch[2].toLowerCase() : 'g';

        // Open Food Facts gives per-100g values, scale to serving size
        const scale = servingSize / 100;

        return {
          name: p.product_name as string,
          brand: (p.brands as string) || null,
          category: null,
          serving_size: servingSize,
          serving_unit: servingUnit,
          calories: Math.round(((n['energy-kcal_100g'] || 0) * scale) * 100) / 100,
          protein_g: Math.round(((n['proteins_100g'] || 0) * scale) * 100) / 100,
          carbs_g: Math.round(((n['carbohydrates_100g'] || 0) * scale) * 100) / 100,
          fat_g: Math.round(((n['fat_100g'] || 0) * scale) * 100) / 100,
          fiber_g: Math.round(((n['fiber_100g'] || 0) * scale) * 100) / 100,
          sugar_g: Math.round(((n['sugars_100g'] || 0) * scale) * 100) / 100,
          sodium_mg: Math.round(((n['sodium_100g'] || 0) * scale * 1000) * 100) / 100, // g → mg
          cholesterol_mg: Math.round(((n['cholesterol_100g'] || 0) * scale * 1000) * 100) / 100,
          saturated_fat_g: Math.round(((n['saturated-fat_100g'] || 0) * scale) * 100) / 100,
          fdc_id: `off-${p.product_name}`, // placeholder ID for Open Food Facts
        };
      });
  } catch (err) {
    console.warn('Open Food Facts search failed:', err);
    return [];
  }
}
