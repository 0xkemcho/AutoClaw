'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolioHistory } from '@/hooks/use-portfolio-history';

export const CHART_COLORS = [
  'var(--chart-1, hsl(38 80% 60%))',
  'var(--chart-2, hsl(162 60% 50%))',
  'var(--chart-3, hsl(22 60% 55%))',
  'var(--chart-4, hsl(250 50% 55%))',
  'var(--chart-5, hsl(300 50% 55%))',
  'var(--success)',
  'var(--destructive)',
  'var(--primary)',
];

/* ------------------------------------------------------------------ */
/*  Allocation (Pie) Chart                                             */
/* ------------------------------------------------------------------ */

interface AllocationChartProps {
  data: Array<{ name: string; value: number }>;
}

export function AllocationChart({ data }: AllocationChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={65}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Sparkline Area (background for token cards)                        */
/* ------------------------------------------------------------------ */

interface SparklineAreaProps {
  data: number[];
  color: string;
}

export function SparklineArea({ data, color }: SparklineAreaProps) {
  const chartData = useMemo(
    () => data.map((v, i) => ({ i, v })),
    [data],
  );

  if (chartData.length < 2) return null;

  const gradientId = `spark-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Performance (Line) Chart                                           */
/* ------------------------------------------------------------------ */

export function PerformanceChart() {
  const { data, isLoading } = usePortfolioHistory();
  const history = data?.history ?? [];

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  if (history.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No performance data yet
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d: string) => {
              const date = new Date(d);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v}`}
            width={50}
          />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            labelStyle={{ color: 'var(--muted-foreground)' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Portfolio']}
            labelFormatter={(d: string) =>
              new Date(d).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            }
          />
          <Line
            type="monotone"
            dataKey="valueUsd"
            stroke="var(--success)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
