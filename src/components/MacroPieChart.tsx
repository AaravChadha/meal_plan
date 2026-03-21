'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface MacroPieChartProps {
  protein: number;
  carbs: number;
  fat: number;
}

export default function MacroPieChart({ protein, carbs, fat }: MacroPieChartProps) {
  const total = protein + carbs + fat;

  const data = {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [
      {
        data: total > 0 ? [protein, carbs, fat] : [1, 1, 1],
        backgroundColor: [
          'rgba(78, 205, 196, 0.85)',
          'rgba(255, 230, 109, 0.85)',
          'rgba(255, 140, 66, 0.85)',
        ],
        borderColor: [
          'rgba(78, 205, 196, 1)',
          'rgba(255, 230, 109, 1)',
          'rgba(255, 140, 66, 1)',
        ],
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 12, family: 'Inter' },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: '#1a1f36',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function (context: { label: string; raw: unknown }) {
            const value = context.raw as number;
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            const cals = context.label === 'Fat' ? value * 9 : value * 4;
            return `${context.label}: ${Math.round(value)}g (${pct}%) · ${Math.round(cals)} kcal`;
          },
        },
      },
    },
  };

  return (
    <div className="chart-wrapper pie">
      <Doughnut data={data} options={options} />
    </div>
  );
}
