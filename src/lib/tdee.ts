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
 * Source: Katch & McArdle, 1983
 *
 * Note: has no age term — assumes age-related decline is captured by
 * lean mass changes. For age 50+, apply correction of ~50 kcal/decade
 * (Poehlman, 1993, Endocr Rev).
 */
export function calculateKatchMcArdleBMR(lean_mass_kg: number, age: number = 25): number {
  let bmr = 370 + 21.6 * lean_mass_kg;
  if (age >= 50) {
    bmr -= ((age - 50) / 10) * 50; // ~50 kcal/decade correction
  }
  return Math.round(bmr);
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
    ? calculateKatchMcArdleBMR(lean_mass_kg, age)
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
  sodium_mg: number;
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
  custom_tdee?: number | null,
): SmartSuggestion {
  const isWorkoutDay = extra_burn > 0;
  const lean_mass_kg = body_fat_pct
    ? Math.round(weight_kg * (1 - body_fat_pct / 100) * 10) / 10
    : null;
  const fat_mass_kg = body_fat_pct
    ? Math.round(weight_kg * (body_fat_pct / 100) * 10) / 10
    : null;

  const bmr = lean_mass_kg
    ? calculateKatchMcArdleBMR(lean_mass_kg, age)
    : calculateBMR(weight_kg, height_cm, age, gender);

  // If user provided a custom maintenance TDEE (e.g. from Apple Health), use that
  // instead of computing from BMR × activity multiplier
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  const computed_tdee = Math.round(bmr * multiplier);
  const base_tdee = custom_tdee ?? computed_tdee;
  const tdee = base_tdee + extra_burn;

  const defaultAdjustments: Record<Goal, number> = { cut: -500, maintain: 0, bulk: 250 };
  const adjustment = custom_adjustment ?? defaultAdjustments[goal];
  const calories = tdee + adjustment;

  // ── Protein ───────────────────────────────────────────────────────
  // Workout days: higher protein for MPS + recovery
  // Rest days: slightly lower — still above optimal threshold (>1.6g/kg),
  // frees up calories for carbs (glycogen replenishment for next session)
  // Cut: 2.3-3.1 g/kg LBM (Helms et al., 2014)
  // Maintain/Bulk: 1.6-2.2 g/kg (Morton et al., 2018; Jager et al., 2017)
  // Age 40+: +0.2 g/kg for anabolic resistance (Moore et al., 2015)
  // Use lean mass if known (more accurate), otherwise total body weight
  // with a lower multiplier since total BW overestimates for heavier people
  const protein_base = lean_mass_kg ?? weight_kg;
  const protein_per_kg_workout: Record<Goal, number> = lean_mass_kg
    ? { cut: 2.4, maintain: 1.8, bulk: 1.8 }   // per kg lean mass
    : { cut: 2.2, maintain: 1.6, bulk: 1.6 };   // per kg total BW
  const protein_per_kg_rest: Record<Goal, number> = lean_mass_kg
    ? { cut: 2.2, maintain: 1.6, bulk: 1.6 }   // per kg lean mass
    : { cut: 2.0, maintain: 1.4, bulk: 1.4 };   // per kg total BW
  const protein_per_kg = isWorkoutDay ? protein_per_kg_workout : protein_per_kg_rest;
  const age_protein_bump = age >= 40 ? 0.2 : 0;
  const protein_g = Math.round(protein_base * (protein_per_kg[goal] + age_protein_bump));

  // ── Fat ─────────────────────────────────────────────────────────
  // Based on body weight, not % of calories. Body needs a minimum for
  // hormones (testosterone, etc.) — only tanks below ~0.5g/kg men, 0.8 women.
  // Workout days: 0.7 g/kg (standard for cut)
  // Rest days on cut: 0.55 g/kg — lower to free up calories for carbs
  //   (glycogen replenishment for next workout matters more than extra fat)
  //   Still above 0.5 floor so hormone production is safe.
  // Maintain/Bulk: 1.0 g/kg both days (no need to restrict)
  // Sources: Helms 2014, Dorgan 1996, DGA 2020-2025
  const fat_per_kg_workout: Record<Goal, number> = { cut: 0.7, maintain: 1.0, bulk: 1.0 };
  const fat_per_kg_rest: Record<Goal, number> = { cut: 0.55, maintain: 1.0, bulk: 1.0 };
  const fat_per_kg_day = isWorkoutDay ? fat_per_kg_workout : fat_per_kg_rest;
  const fat_floor = gender === 'female' ? 0.8 : 0.5;
  const fat_g = Math.round(weight_kg * Math.max(fat_per_kg_day[goal], fat_floor));

  // ── Carbs ───────────────────────────────────────────────────────
  // Fill remaining calories. Naturally higher on workout days (more
  // total calories, same protein/fat) and lower on rest days.
  const remaining_cals = calories - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(0, Math.round(remaining_cals / 4));

  // ── Sodium ──────────────────────────────────────────────────────
  // No validated weight-based formula exists in literature.
  // Base: 2300mg (DGA 2020-2025). Age 50+: 1500mg (AHA).
  // Activity adds for sweat losses (ACSM/ISSN position stands).
  // Workout adds ~500mg/session (Baker et al., 2016: 200-2000mg/hr).
  const sodium_age_base = age >= 50 ? 1500 : 2300;
  const sodium_activity_add: Record<ActivityLevel, number> = {
    sedentary: 0, light: 500, moderate: 1000, active: 1500, very_active: 2000,
  };
  const sodium_workout_add = isWorkoutDay ? 500 : 0;
  const sodium_mg = Math.min(4500, sodium_age_base + sodium_activity_add[activityLevel] + sodium_workout_add);

  // ── Fiber ───────────────────────────────────────────────────────
  // 14g per 1,000 kcal consumed (IOM, 2005). Floor 25g, cap 50g.
  const fiber_g = Math.max(25, Math.min(50, Math.round(14 * (calories / 1000))));

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

  // Dynamic rate message based on actual adjustment
  const weeklyKg = Math.abs(adjustment) * 7 / 7700;
  const rateStr = weeklyKg.toFixed(2);
  const rate_messages: Record<Goal, string> = {
    cut: `At a ${Math.abs(adjustment)} cal deficit, expect to lose ~${rateStr} kg (~${(weeklyKg * 2.2).toFixed(1)} lb) per week.`,
    bulk: `At a ${Math.abs(adjustment)} cal surplus, expect to gain ~${rateStr} kg/week, mostly muscle.`,
    maintain: adjustment === 0
      ? 'Eating at your TDEE will maintain your current weight.'
      : adjustment < 0
      ? `At a ${Math.abs(adjustment)} cal deficit, expect to lose ~${rateStr} kg/week.`
      : `At a ${adjustment} cal surplus, expect to gain ~${rateStr} kg/week.`,
  };

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g,
    sodium_mg,
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
// These describe your NON-EXERCISE daily movement only
export const BASE_ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary — mostly sitting (desk job, online classes, driving everywhere)',
  light: 'Lightly Active — some movement (walking to classes, errands, light housework, ~4-6k steps)',
  moderate: 'Moderately Active — moving regularly (on feet for work, walking a lot, ~7-10k steps)',
  active: 'Very Active — physically demanding day (retail, waiter, coaching, ~10-15k steps)',
  very_active: 'Extra Active — heavy labor all day (construction, farming, moving/lifting constantly)',
};

export const GOAL_LABELS: Record<Goal, string> = {
  cut: 'Lose Weight (cut)',
  maintain: 'Maintain Weight',
  bulk: 'Build Muscle (bulk)',
};
