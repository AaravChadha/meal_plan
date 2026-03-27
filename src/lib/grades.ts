// ── Grading System ───────────────────────────────────────────────────

export type LetterGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export interface NutrientGrade {
  key: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  grade: LetterGrade;
  score: number;       // 0–100, used for weighted overall grade
  feedback: string;
  isLimitType: boolean;
}

export interface DayGrade {
  date: string;
  overall_grade: LetterGrade;
  overall_score: number;
  nutrients: NutrientGrade[];
  logged_anything: boolean;
}

export interface TargetCalibration {
  key: string;
  label: string;
  unit: string;
  suggested: number;
  custom: number;
  grade: LetterGrade;
  message: string;
}

export interface CalibrationReport {
  overall_grade: LetterGrade;
  overall_score: number;
  items: TargetCalibration[];
}

// ── Score → letter grade ──────────────────────────────────────────────
// Think of it like a 100-point scale divided into finer buckets:
// A range: 97+ = A+, 93-96 = A, 90-92 = A-
// B range: 87-89 = B+, 83-86 = B, 80-82 = B-
// C range: 77-79 = C+, 73-76 = C, 70-72 = C-
// D: 60-69, F: below 60
export function scoreToGrade(score: number): LetterGrade {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

export const GRADE_COLORS: Record<LetterGrade, string> = {
  'A+': '#059669', // deep emerald
  'A':  '#10b981', // emerald
  'A-': '#34d399', // light emerald
  'B+': '#0e9488', // deep teal
  'B':  '#4ecdc4', // teal
  'B-': '#7eddd8', // light teal
  'C+': '#d4a017', // deep yellow
  'C':  '#ffe66d', // yellow
  'C-': '#facc15', // lighter yellow
  'D':  '#ff8c42', // orange
  'F':  '#ff6b6b', // red
};

// ── Score protein ──────────────────────────────────────────────────────
// Over is GOOD up to ~150% — preserves muscle on cut, supports recovery.
// Under is bad — muscle loss risk on cut, missed gains on bulk.
// Over 150%: diminishing returns, wastes calories.
function scoreProtein(current: number, target: number): number {
  if (target === 0) return 100;
  const pct = (current / target) * 100;
  if (pct >= 90 && pct <= 150) return 100;  // 90–150%: all great
  if (pct >= 80 && pct < 90) return 85;
  if (pct > 150 && pct <= 180) return 90;   // over 150: mild penalty
  if (pct >= 70 && pct < 80) return 72;
  if (pct > 180) return 75;                 // way over: wasteful
  if (pct >= 60 && pct < 70) return 60;
  return Math.max(15, Math.round(pct * 0.5));
}

// ── Score fiber ──────────────────────────────────────────────────────
// Over is fine up to 50g cap. Under is bad (poor digestion, less satiety).
function scoreFiber(current: number, target: number): number {
  if (target === 0) return 100;
  const pct = (current / target) * 100;
  if (pct >= 85 && pct <= 100) return 100;
  if (pct > 100 && current <= 50) return 100; // over but under 50g cap
  if (current > 50) return 80;                 // GI discomfort risk
  if (pct >= 70 && pct < 85) return 83;
  if (pct >= 55 && pct < 70) return 68;
  return Math.max(20, Math.round(pct * 0.7));
}

// ── Score carbs/fat ──────────────────────────────────────────────────
// Goal-aware: on cut, under is ok (fewer calories = good). Over is bad.
// On bulk: more symmetric. On maintain: fully symmetric.
function scoreCarbsFat(current: number, target: number, goal: string = 'maintain'): number {
  if (target === 0) return 100;
  const pct = (current / target) * 100;

  if (goal === 'cut') {
    if (pct >= 80 && pct <= 105) return 100;  // under is fine on cut
    if (pct >= 70 && pct < 80) return 92;
    if (pct > 105 && pct <= 115) return 85;
    if (pct >= 60 && pct < 70) return 80;
    if (pct > 115 && pct <= 130) return 70;
    if (pct > 130 && pct <= 150) return 55;
    if (pct > 150) return 40;
    return Math.max(20, Math.round(pct * 0.7));
  }

  if (goal === 'bulk') {
    if (pct >= 85 && pct <= 120) return 100;  // slightly over ok on bulk
    if (pct >= 75 && pct < 85) return 85;
    if (pct > 120 && pct <= 135) return 88;
    if (pct >= 60 && pct < 75) return 70;
    if (pct > 135 && pct <= 160) return 65;
    if (pct > 160) return 45;
    return Math.max(15, Math.round(pct * 0.6));
  }

  // Maintain: symmetric
  const dev = Math.abs(pct - 100);
  if (dev <= 10) return 100;
  if (dev <= 20) return 85;
  if (dev <= 30) return 70;
  if (dev <= 40) return 55;
  return 35;
}


// ── Score calories ─────────────────────────────────────────────────────
// On a cut: slightly under is BETTER than slightly over (deficit is the goal)
//   BUT extreme under-eating (crash dieting) is dangerous — muscle loss,
//   metabolic adaptation, hormonal disruption. Penalize both extremes.
// On a bulk: slightly over is better than under
//   BUT massive surplus = mostly fat gain. Penalize both extremes.
// On maintain: symmetric
function scoreCalories(current: number, target: number, goal: string = 'maintain'): number {
  if (target === 0) return 100;
  const pct = (current / target) * 100;

  // Universal: extreme starvation is always terrible
  if (pct < 40) return 15;

  if (goal === 'cut') {
    // Perfect zone: 85–100% of target (hitting deficit well)
    if (pct >= 85 && pct <= 100) return 100;
    // Slightly over (100–105%): still good on a cut
    if (pct > 100 && pct <= 105) return 93;
    // Aggressive deficit (75–85%): works but risking muscle loss
    if (pct >= 75 && pct < 85) return 88;
    // Over target (105–115%): not ideal on a cut
    if (pct > 105 && pct <= 115) return 78;
    // Too far under (60–75%): crash diet territory — metabolic adaptation
    if (pct >= 60 && pct < 75) return 62;
    // Significantly over (115–130%): defeating the purpose of cutting
    if (pct > 115 && pct <= 130) return 60;
    // Extreme under (40–60%): dangerous
    if (pct >= 40 && pct < 60) return 35;
    // Way over (>130%): not cutting anymore
    return 30;
  }

  if (goal === 'bulk') {
    // Perfect zone: 95–110% (hitting surplus)
    if (pct >= 95 && pct <= 110) return 100;
    // Slightly over (110–120%): fine on a bulk
    if (pct > 110 && pct <= 120) return 93;
    // Slightly under (85–95%): not eating enough to grow
    if (pct >= 85 && pct < 95) return 83;
    // Dirty bulk (120–140%): mostly fat gain at this surplus
    if (pct > 120 && pct <= 140) return 73;
    // Under (75–85%): not bulking anymore
    if (pct >= 75 && pct < 85) return 65;
    // Way over (>140%): excessive, all fat
    if (pct > 140) return 50;
    // Significantly under (60–75%)
    if (pct >= 60 && pct < 75) return 50;
    // Extreme under (<60%): losing weight on a bulk
    return 30;
  }

  // Maintain: symmetric — distance from 100% is what matters
  const deviance = Math.abs(pct - 100);
  if (deviance <= 5) return 100;
  if (deviance <= 10) return 92;
  if (deviance <= 15) return 82;
  if (deviance <= 20) return 72;
  if (deviance <= 30) return 60;
  if (deviance <= 40) return 45;
  return 25;
}

// ── Score a "limit" nutrient (sodium, saturated fat, cholesterol) ─────
// You want to stay UNDER the target. Going over is bad.
function scoreLimitNutrient(current: number, target: number): number {
  if (target === 0) return 100;
  const pct = (current / target) * 100;
  if (pct <= 80) return 100;   // well under — great
  if (pct <= 100) return 88;   // under limit — good
  if (pct <= 110) return 72;   // slightly over
  if (pct <= 125) return 62;   // over
  return 30;                    // well over
}

function feedbackHit(label: string, current: number, target: number, unit: string): string {
  if (target === 0) return `No target set for ${label}.`;
  const pct = Math.round((current / target) * 100);
  if (pct >= 90 && pct <= 120) return `${label} on track at ${pct}% of target.`;
  if (pct > 120 && pct <= 150) return `${label} slightly over target (${pct}%) — mostly fine.`;
  if (pct > 150 && pct <= 200) return `${label} well over target (${pct}%) — extra ${label.toLowerCase()} isn't adding benefit and wastes calories.`;
  if (pct > 200) return `${label} at ${pct}% of target — way too much. This crowds out other macros.`;
  if (pct >= 70) return `${label} a bit low — ${Math.round(target - current)}${unit} short of target.`;
  return `${label} significantly under target — only ${pct}%, ${Math.round(target - current)}${unit} remaining.`;
}

function feedbackCalories(current: number, target: number, goal: string = 'maintain'): string {
  if (target === 0) return 'No calorie target set.';
  const pct = Math.round((current / target) * 100);
  const diff = Math.round(current - target);
  if (pct >= 85 && pct <= 105) return `Calories right on target (${pct}%).`;
  if (pct < 40) return `Only ${current} kcal — dangerously low. Your body needs fuel to function.`;
  if (pct < 60) return `${Math.abs(diff)} kcal under target (${pct}%) — extreme deficit risks muscle loss and metabolic slowdown.`;
  if (pct < 75) return `${Math.abs(diff)} kcal under target (${pct}%) — ${goal === 'cut' ? 'too aggressive, consider eating more to preserve muscle' : 'significantly under'}.`;
  if (pct < 85) return `${Math.abs(diff)} kcal under target (${pct}%).`;
  if (pct > 130) return `${diff} kcal over target (${pct}%) — ${goal === 'cut' ? 'this erases your deficit entirely' : goal === 'bulk' ? 'excessive surplus, mostly stored as fat' : 'well over maintenance'}.`;
  if (pct > 115) return `${diff} kcal over target (${pct}%) — ${goal === 'cut' ? 'over target on a cut' : 'surplus is getting large'}.`;
  return `${diff} kcal over target (${pct}%).`;
}

function feedbackLimit(label: string, current: number, target: number, unit: string): string {
  if (target === 0) return `No limit set for ${label}.`;
  const pct = Math.round((current / target) * 100);
  if (pct <= 80) return `${label} well under limit (${pct}%) — excellent.`;
  if (pct <= 100) return `${label} under limit (${pct}%).`;
  const over = Math.round(current - target);
  return `${label} over limit by ${over}${unit} (${pct}% of limit).`;
}

// ── Grade a single day's data ─────────────────────────────────────────
export function gradeDay(
  summary: Record<string, number>,
  targets: Record<string, number>,
  goal: string = 'maintain',
): DayGrade {
  const date = (summary.date as unknown as string) ?? '';
  const logged_anything = summary.total_calories > 0;

  const nutrients: NutrientGrade[] = [
    {
      key: 'calories',
      label: 'Calories',
      current: Math.round(summary.total_calories ?? 0),
      target: Math.round(targets.calories ?? 2000),
      unit: 'kcal',
      isLimitType: false,
      score: scoreCalories(summary.total_calories ?? 0, targets.calories ?? 2000, goal),
      grade: 'A',
      feedback: feedbackCalories(summary.total_calories ?? 0, targets.calories ?? 2000, goal),
    },
    {
      key: 'protein',
      label: 'Protein',
      current: Math.round(summary.total_protein_g ?? 0),
      target: Math.round(targets.protein_g ?? 150),
      unit: 'g',
      isLimitType: false,
      score: scoreProtein(summary.total_protein_g ?? 0, targets.protein_g ?? 150),
      grade: 'A',
      feedback: feedbackHit('Protein', summary.total_protein_g ?? 0, targets.protein_g ?? 150, 'g'),
    },
    {
      key: 'carbs',
      label: 'Carbs',
      current: Math.round(summary.total_carbs_g ?? 0),
      target: Math.round(targets.carbs_g ?? 250),
      unit: 'g',
      isLimitType: false,
      score: scoreCarbsFat(summary.total_carbs_g ?? 0, targets.carbs_g ?? 250, goal),
      grade: 'A',
      feedback: feedbackHit('Carbs', summary.total_carbs_g ?? 0, targets.carbs_g ?? 250, 'g'),
    },
    {
      key: 'fat',
      label: 'Fat',
      current: Math.round(summary.total_fat_g ?? 0),
      target: Math.round(targets.fat_g ?? 65),
      unit: 'g',
      isLimitType: false,
      score: scoreCarbsFat(summary.total_fat_g ?? 0, targets.fat_g ?? 65, goal),
      grade: 'A',
      feedback: feedbackHit('Fat', summary.total_fat_g ?? 0, targets.fat_g ?? 65, 'g'),
    },
    {
      key: 'fiber',
      label: 'Fiber',
      current: Math.round(summary.total_fiber_g ?? 0),
      target: Math.round(targets.fiber_g ?? 30),
      unit: 'g',
      isLimitType: false,
      score: scoreFiber(summary.total_fiber_g ?? 0, targets.fiber_g ?? 30),
      grade: 'A',
      feedback: feedbackHit('Fiber', summary.total_fiber_g ?? 0, targets.fiber_g ?? 30, 'g'),
    },
    {
      key: 'sodium',
      label: 'Sodium',
      current: Math.round(summary.total_sodium_mg ?? 0),
      target: Math.round(targets.sodium_mg ?? 2300),
      unit: 'mg',
      isLimitType: true,
      score: scoreLimitNutrient(summary.total_sodium_mg ?? 0, targets.sodium_mg ?? 2300),
      grade: 'A',
      feedback: feedbackLimit('Sodium', summary.total_sodium_mg ?? 0, targets.sodium_mg ?? 2300, 'mg'),
    },
  ];

  // Assign letter grades
  nutrients.forEach(n => { n.grade = scoreToGrade(n.score); });

  // Weighted overall score
  const weights: Record<string, number> = {
    calories: 0.25,
    protein: 0.25,
    fiber: 0.15,
    sodium: 0.15,
    carbs: 0.10,
    fat: 0.10,
  };
  const overall_score = Math.round(
    nutrients.reduce((sum, n) => sum + n.score * (weights[n.key] ?? 0.1), 0)
  );

  return {
    date,
    overall_grade: scoreToGrade(overall_score),
    overall_score,
    nutrients,
    logged_anything,
  };
}

// ── Grade how custom targets compare to suggested targets ─────────────
// Grades each macro target on how well-calibrated the custom value is.
export function gradeCalibration(
  custom: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; sodium_mg: number },
  suggested: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number },
  goal: string,
): CalibrationReport {
  const items: TargetCalibration[] = [];

  // Helper: how far off is custom from suggested (as %)
  const diffPct = (c: number, s: number) => s === 0 ? 0 : Math.round(((c - s) / s) * 100);

  // Calories — should be close either way
  const calDiff = diffPct(custom.calories, suggested.calories);
  const calAbs = Math.abs(calDiff);
  const calScore = calAbs <= 2 ? 97 : calAbs <= 5 ? 93 : calAbs <= 8 ? 90 : calAbs <= 12 ? 87 : calAbs <= 15 ? 83 : calAbs <= 20 ? 77 : calAbs <= 25 ? 73 : calAbs <= 40 ? 62 : 40;
  items.push({
    key: 'calories',
    label: 'Calories',
    unit: 'kcal',
    suggested: suggested.calories,
    custom: custom.calories,
    grade: scoreToGrade(calScore),
    message: calAbs <= 5
      ? 'Matches recommendation closely.'
      : calDiff > 0
        ? `${calDiff}% above suggested — you may gain weight faster than planned.`
        : `${Math.abs(calDiff)}% below suggested — may be too aggressive${goal === 'bulk' ? ' for a bulk' : ''}.`,
  });

  // Protein — setting too LOW is bad (muscle loss risk). Setting higher is fine.
  const protDiff = diffPct(custom.protein_g, suggested.protein_g);
  const protScore = protDiff >= -5 ? 100 : protDiff >= -15 ? 82 : protDiff >= -25 ? 72 : protDiff >= -40 ? 62 : 30;
  items.push({
    key: 'protein',
    label: 'Protein',
    unit: 'g',
    suggested: suggested.protein_g,
    custom: custom.protein_g,
    grade: scoreToGrade(protScore),
    message: protDiff >= -5
      ? 'Protein target looks good.'
      : `${Math.abs(protDiff)}% below suggested — low protein risks muscle loss${goal === 'cut' ? ' on a cut' : ''}.`,
  });

  // Carbs — symmetric, being far off either way is suboptimal
  const carbDiff = Math.abs(diffPct(custom.carbs_g, suggested.carbs_g));
  items.push({
    key: 'carbs',
    label: 'Carbs',
    unit: 'g',
    suggested: suggested.carbs_g,
    custom: custom.carbs_g,
    grade: scoreToGrade(carbDiff <= 3 ? 97 : carbDiff <= 7 ? 93 : carbDiff <= 10 ? 90 : carbDiff <= 14 ? 87 : carbDiff <= 20 ? 83 : carbDiff <= 28 ? 75 : carbDiff <= 35 ? 70 : carbDiff <= 50 ? 62 : 40),
    message: carbDiff <= 10
      ? 'Carb target close to recommendation.'
      : `${carbDiff}% off suggested. ${custom.carbs_g < suggested.carbs_g ? 'Lower carbs may hurt energy levels.' : 'Higher carbs may make hitting calorie target harder.'}`,
  });

  // Fat — symmetric
  const fatDiff = Math.abs(diffPct(custom.fat_g, suggested.fat_g));
  items.push({
    key: 'fat',
    label: 'Fat',
    unit: 'g',
    suggested: suggested.fat_g,
    custom: custom.fat_g,
    grade: scoreToGrade(fatDiff <= 3 ? 97 : fatDiff <= 7 ? 93 : fatDiff <= 10 ? 90 : fatDiff <= 14 ? 87 : fatDiff <= 20 ? 83 : fatDiff <= 28 ? 75 : fatDiff <= 35 ? 70 : fatDiff <= 50 ? 62 : 40),
    message: fatDiff <= 10
      ? 'Fat target close to recommendation.'
      : `${fatDiff}% off suggested. ${custom.fat_g < suggested.fat_g ? 'Very low fat can affect hormones.' : 'High fat may crowd out protein and carbs.'}`,
  });

  // Fiber — setting lower is bad
  const fiberDiff = diffPct(custom.fiber_g, suggested.fiber_g);
  const fiberScore = fiberDiff >= -5 ? 100 : fiberDiff >= -15 ? 82 : fiberDiff >= -30 ? 72 : 50;
  items.push({
    key: 'fiber',
    label: 'Fiber',
    unit: 'g',
    suggested: suggested.fiber_g,
    custom: custom.fiber_g,
    grade: scoreToGrade(fiberScore),
    message: fiberDiff >= -5
      ? 'Fiber target looks healthy.'
      : `${Math.abs(fiberDiff)}% below suggested — fiber supports digestion and satiety.`,
  });

  const overall_score = Math.round(items.reduce((s, i) => {
    const scoreMap: Record<LetterGrade, number> = {
      'A+': 98, 'A': 95, 'A-': 91, 'B+': 88, 'B': 85, 'B-': 81,
      'C+': 78, 'C': 75, 'C-': 71, 'D': 65, 'F': 40,
    };
    return s + scoreMap[i.grade];
  }, 0) / items.length);

  return {
    overall_grade: scoreToGrade(overall_score),
    overall_score,
    items,
  };
}
