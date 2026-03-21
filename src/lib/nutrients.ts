import { NutrientStatus, NutrientProgress } from '@/types';

// ── Nutrient metadata ─────────────────────────────────────────────
export interface NutrientMeta {
  key: string;
  label: string;
  unit: string;
  color: string;
  isLimitType: boolean; // true = you want to stay UNDER this target
}

export const NUTRIENTS: NutrientMeta[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#FF6B6B', isLimitType: false },
  { key: 'protein_g', label: 'Protein', unit: 'g', color: '#4ECDC4', isLimitType: false },
  { key: 'carbs_g', label: 'Carbs', unit: 'g', color: '#FFE66D', isLimitType: false },
  { key: 'fat_g', label: 'Fat', unit: 'g', color: '#FF8C42', isLimitType: false },
  { key: 'fiber_g', label: 'Fiber', unit: 'g', color: '#95E06C', isLimitType: false },
  { key: 'sugar_g', label: 'Sugar', unit: 'g', color: '#F472B6', isLimitType: true },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', color: '#818CF8', isLimitType: true },
  { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg', color: '#FB923C', isLimitType: true },
  { key: 'saturated_fat_g', label: 'Sat. Fat', unit: 'g', color: '#F87171', isLimitType: true },
];

// ── Status thresholds ─────────────────────────────────────────────
export function getNutrientStatus(current: number, target: number, isLimitType: boolean): NutrientStatus {
  if (target === 0) return 'on_target';
  const pct = (current / target) * 100;

  if (isLimitType) {
    // For sodium, cholesterol, etc. — lower is better
    if (pct <= 80) return 'on_target';
    if (pct <= 100) return 'high';
    return 'excessive';
  } else {
    // For protein, fiber, etc. — hitting the target is good
    if (pct < 50) return 'low';
    if (pct >= 80 && pct <= 120) return 'on_target';
    if (pct > 120) return 'excessive';
    return 'high'; // 50-80%
  }
}

export function getStatusColor(status: NutrientStatus): string {
  switch (status) {
    case 'low': return 'var(--status-warning)';
    case 'on_target': return 'var(--status-success)';
    case 'high': return 'var(--status-caution)';
    case 'excessive': return 'var(--status-danger)';
  }
}

export function getStatusLabel(status: NutrientStatus): string {
  switch (status) {
    case 'low': return 'Too Low';
    case 'on_target': return 'On Target';
    case 'high': return 'Getting High';
    case 'excessive': return 'Excessive';
  }
}

// ── Build nutrient progress from daily totals ─────────────────────
export function buildNutrientProgress(
  current: Record<string, number>,
  targets: Record<string, number>,
): NutrientProgress[] {
  return NUTRIENTS.map((n) => {
    const curr = current[n.key] ?? 0;
    const tgt = targets[n.key] ?? 0;
    const pct = tgt > 0 ? (curr / tgt) * 100 : 0;
    return {
      name: n.label,
      current: Math.round(curr * 10) / 10,
      target: tgt,
      unit: n.unit,
      percentage: Math.round(pct),
      status: getNutrientStatus(curr, tgt, n.isLimitType),
      isLimitType: n.isLimitType,
    };
  });
}

// ── Macro percentages ─────────────────────────────────────────────
export function calcMacroPercentages(protein_g: number, carbs_g: number, fat_g: number) {
  const proteinCal = protein_g * 4;
  const carbsCal = carbs_g * 4;
  const fatCal = fat_g * 9;
  const total = proteinCal + carbsCal + fatCal;
  if (total === 0) return { protein_pct: 0, carbs_pct: 0, fat_pct: 0 };
  return {
    protein_pct: Math.round((proteinCal / total) * 100),
    carbs_pct: Math.round((carbsCal / total) * 100),
    fat_pct: Math.round((fatCal / total) * 100),
  };
}

// ── Default targets ───────────────────────────────────────────────
export const DEFAULT_TARGETS = {
  calories: 2000,
  protein_g: 150,
  carbs_g: 250,
  fat_g: 65,
  fiber_g: 30,
  sugar_g: 50,
  sodium_mg: 2300,
  cholesterol_mg: 300,
  saturated_fat_g: 20,
};
