// ── TDEE Calculator (Mifflin-St Jeor) ─────────────────────────────
// This is the gold-standard equation for estimating BMR.

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Goal = 'cut' | 'maintain' | 'bulk';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,     // Little or no exercise
  light: 1.375,       // Light exercise 1-3 days/week
  moderate: 1.55,     // Moderate exercise 3-5 days/week
  active: 1.725,      // Heavy exercise 6-7 days/week
  very_active: 1.9,   // Very heavy exercise, physical job
};

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  cut: -500,       // ~1 lb/week loss
  maintain: 0,
  bulk: 300,       // Lean bulk surplus
};

export interface TDEEResult {
  bmr: number;
  tdee: number;
  adjusted: number; // After goal adjustment
  goal: Goal;
}

/**
 * Calculate BMR using Mifflin-St Jeor equation
 * Male:   10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161 + 166
 * Female: 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
 * We use a gender-neutral average for simplicity in MVP.
 */
export function calculateBMR(weight_kg: number, height_cm: number, age: number): number {
  // Gender-neutral Mifflin-St Jeor (average of male + female formulas)
  return Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age - 78);
}

export function calculateTDEE(
  weight_kg: number,
  height_cm: number,
  age: number,
  activityLevel: ActivityLevel,
  goal: Goal,
): TDEEResult {
  const bmr = calculateBMR(weight_kg, height_cm, age);
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  const tdee = Math.round(bmr * multiplier);
  const adjusted = tdee + GOAL_ADJUSTMENTS[goal];

  return { bmr, tdee, adjusted, goal };
}

/**
 * Generate recommended macro targets based on TDEE and goal.
 */
export function recommendMacros(adjustedTDEE: number, goal: Goal) {
  let proteinPct: number, carbsPct: number, fatPct: number;

  switch (goal) {
    case 'cut':
      proteinPct = 0.35; carbsPct = 0.35; fatPct = 0.30;
      break;
    case 'bulk':
      proteinPct = 0.25; carbsPct = 0.45; fatPct = 0.30;
      break;
    default: // maintain
      proteinPct = 0.30; carbsPct = 0.40; fatPct = 0.30;
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

export const GOAL_LABELS: Record<Goal, string> = {
  cut: 'Lose Weight (-500 cal/day)',
  maintain: 'Maintain Weight',
  bulk: 'Build Muscle (+300 cal/day)',
};
