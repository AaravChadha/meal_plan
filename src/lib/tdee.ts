// ── TDEE Calculator ─────────────────────────────────────────────────

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'cut' | 'maintain' | 'bulk';
export type Gender = 'male' | 'female' | 'neutral';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface TDEEResult {
  bmr: number;
  tdee: number;
  adjusted: number;
  goal: Goal;
}

/**
 * Mifflin-St Jeor BMR — standard formula, requires gender for accuracy.
 * Male:   10w + 6.25h - 5a + 5
 * Female: 10w + 6.25h - 5a - 161
 * Neutral: average of both
 */
export function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: Gender = 'neutral',
): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  if (gender === 'male') return Math.round(base + 5);
  if (gender === 'female') return Math.round(base - 161);
  return Math.round(base - 78); // neutral average
}

/**
 * Katch-McArdle BMR — more accurate when body fat % is known
 * because it's based on lean body mass, not total weight.
 * Formula: 370 + 21.6 * lean_mass_kg
 */
export function calculateKatchMcArdleBMR(lean_mass_kg: number): number {
  return Math.round(370 + 21.6 * lean_mass_kg);
}

export function calculateTDEE(
  weight_kg: number,
  height_cm: number,
  age: number,
  activityLevel: ActivityLevel,
  goal: Goal,
  gender: Gender = 'neutral',
  body_fat_pct?: number | null,
): TDEEResult {
  const lean_mass_kg = body_fat_pct ? weight_kg * (1 - body_fat_pct / 100) : null;
  const bmr = lean_mass_kg
    ? calculateKatchMcArdleBMR(lean_mass_kg)
    : calculateBMR(weight_kg, height_cm, age, gender);

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  const tdee = Math.round(bmr * multiplier);

  const adjustments: Record<Goal, number> = { cut: -500, maintain: 0, bulk: 250 };
  const adjusted = tdee + adjustments[goal];

  return { bmr, tdee, adjusted, goal };
}

export interface SmartSuggestion {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  bmr: number;
  tdee: number;
  lean_mass_kg: number | null;
  fat_mass_kg: number | null;
  tips: string[];           // context-aware advice
  rate_message: string;     // "expect to lose ~0.5kg/week"
}

/**
 * Generate smart nutrition targets with body-composition-aware protein targets
 * and contextual advice about whether the chosen goal makes sense for their stats.
 */
export function generateSmartSuggestion(
  weight_kg: number,
  height_cm: number,
  age: number,
  activityLevel: ActivityLevel,
  goal: Goal,
  gender: Gender = 'neutral',
  body_fat_pct?: number | null,
  extra_burn: number = 0,
  custom_adjustment?: number,
): SmartSuggestion {
  const lean_mass_kg = body_fat_pct
    ? Math.round(weight_kg * (1 - body_fat_pct / 100) * 10) / 10
    : null;
  const fat_mass_kg = body_fat_pct
    ? Math.round(weight_kg * (body_fat_pct / 100) * 10) / 10
    : null;

  const bmr = lean_mass_kg
    ? calculateKatchMcArdleBMR(lean_mass_kg)
    : calculateBMR(weight_kg, height_cm, age, gender);

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  const tdee = Math.round(bmr * multiplier) + extra_burn;

  const defaultAdjustments: Record<Goal, number> = { cut: -500, maintain: 0, bulk: 250 };
  const adjustment = custom_adjustment ?? defaultAdjustments[goal];
  const calories = tdee + adjustment;

  // Protein: based on lean mass if known, otherwise total weight.
  // Higher on cut to preserve muscle, slightly lower on bulk.
  const protein_base = lean_mass_kg ?? weight_kg;
  const protein_per_kg: Record<Goal, number> = { cut: 2.3, maintain: 1.8, bulk: 1.8 };
  const protein_g = Math.round(protein_base * protein_per_kg[goal]);

  // Fat: 30% of calories on bulk/maintain, 35% on cut (fat is satiating on a deficit)
  const fat_pct = goal === 'cut' ? 0.35 : 0.30;
  const fat_g = Math.round((calories * fat_pct) / 9);

  // Carbs: whatever calories are left after protein and fat
  const remaining_cals = calories - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(0, Math.round(remaining_cals / 4));

  // Context-aware tips
  const tips: string[] = [];

  if (body_fat_pct) {
    const highBf = gender === 'female' ? 30 : 20;
    const lowBf = gender === 'female' ? 22 : 15;

    if (goal === 'cut') {
      if (body_fat_pct > highBf)
        tips.push(`At ${body_fat_pct}% body fat you have plenty of fat stores — a 500 cal deficit is appropriate and safe.`);
      else if (body_fat_pct > lowBf)
        tips.push(`At ${body_fat_pct}% body fat a moderate cut works well. Protein is set high to preserve your muscle.`);
      else
        tips.push(`You're already fairly lean at ${body_fat_pct}%. Consider a smaller deficit (250 cal) to avoid losing muscle.`);
    } else if (goal === 'bulk') {
      if (body_fat_pct < lowBf)
        tips.push(`At ${body_fat_pct}% body fat you're in a great position to bulk — your body will partition more calories toward muscle.`);
      else if (body_fat_pct <= highBf)
        tips.push(`At ${body_fat_pct}% body fat a lean bulk with a modest surplus (250 cal) makes sense.`);
      else
        tips.push(`At ${body_fat_pct}% body fat, consider cutting first before bulking — you'll get better muscle gains at lower body fat.`);
    }

    if (lean_mass_kg) {
      tips.push(`Protein target (${protein_g}g) is calculated from your lean mass (${lean_mass_kg} kg) — more accurate than using total body weight.`);
    }
  } else {
    tips.push('Enter your body fat % for more accurate protein targets and personalized advice.');
  }

  const rate_messages: Record<Goal, string> = {
    cut: 'At a 500 cal deficit, expect to lose ~0.45 kg (1 lb) per week.',
    bulk: 'At a 250 cal surplus, expect to gain ~0.2 kg/week, mostly muscle.',
    maintain: 'Eating at your TDEE will maintain your current weight.',
  };

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g: 30,
    bmr,
    tdee,
    lean_mass_kg,
    fat_mass_kg,
    tips,
    rate_message: rate_messages[goal],
  };
}

export function recommendMacros(adjustedTDEE: number, goal: Goal) {
  let proteinPct: number, carbsPct: number, fatPct: number;
  switch (goal) {
    case 'cut':      proteinPct = 0.35; carbsPct = 0.35; fatPct = 0.30; break;
    case 'bulk':     proteinPct = 0.25; carbsPct = 0.45; fatPct = 0.30; break;
    default:         proteinPct = 0.30; carbsPct = 0.40; fatPct = 0.30;
  }
  return {
    target_calories: adjustedTDEE,
    target_protein_g: Math.round((adjustedTDEE * proteinPct) / 4),
    target_carbs_g: Math.round((adjustedTDEE * carbsPct) / 4),
    target_fat_g: Math.round((adjustedTDEE * fatPct) / 9),
    target_fiber_g: 30,
    target_sodium_mg: 2300,
  };
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (little/no exercise)',
  light: 'Lightly Active (1-3 days/week)',
  moderate: 'Moderately Active (3-5 days/week)',
  active: 'Very Active (6-7 days/week)',
  very_active: 'Extra Active (physical job + training)',
};

// Labels for base daily activity (excluding workouts)
export const BASE_ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk/classes, minimal walking)',
  light: 'Lightly Active (some walking, light chores)',
  moderate: 'Moderately Active (on feet most of day)',
  active: 'Very Active (physical job, lots of walking)',
  very_active: 'Extra Active (construction, manual labor)',
};

export const GOAL_LABELS: Record<Goal, string> = {
  cut: 'Lose Weight (cut)',
  maintain: 'Maintain Weight',
  bulk: 'Build Muscle (bulk)',
};
