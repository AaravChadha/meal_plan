'use client';

import { getStatusColor, getStatusLabel, getNutrientStatus } from '@/lib/nutrients';

interface NutrientProgressProps {
  name: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  isLimitType?: boolean;
}

export default function NutrientProgress({
  name,
  current,
  target,
  unit,
  color,
  isLimitType = false,
}: NutrientProgressProps) {
  const pct = target > 0 ? Math.min((current / target) * 100, 150) : 0;
  const displayPct = Math.min(pct, 100);
  const status = getNutrientStatus(current, target, isLimitType);
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);

  return (
    <div className="progress-item">
      <div className="progress-header">
        <span className="progress-label">{name}</span>
        <span className="progress-values">
          <span>{Math.round(current * 10) / 10}</span> / {target} {unit}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${displayPct}%`,
            backgroundColor: pct > 100 && isLimitType ? 'var(--status-danger)' : color,
          }}
        />
      </div>
      <div className="progress-status" style={{ color: statusColor }}>
        {statusLabel} · {Math.round(pct)}%
      </div>
    </div>
  );
}
