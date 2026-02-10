'use client';

import * as React from 'react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Card primitives                                                    */
/* ------------------------------------------------------------------ */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AnimatedCard({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'group/animated-card relative w-full overflow-hidden rounded-card-lg border border-border bg-background-card',
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'flex flex-col space-y-1.5 border-t border-border p-4',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-base font-semibold leading-none tracking-tight text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-foreground-muted', className)} {...props} />
  );
}

export function CardVisual({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('h-[180px] w-full overflow-hidden', className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Shared layers                                                      */
/* ------------------------------------------------------------------ */

function GridLayer({ color }: { color: string }) {
  return (
    <div
      style={{ '--grid-color': color } as React.CSSProperties}
      className="pointer-events-none absolute inset-0 z-[4] h-full w-full bg-transparent bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] bg-[size:20px_20px] bg-center opacity-70 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]"
    />
  );
}

function EllipseGlow({ color, id }: { color: string; id: string }) {
  return (
    <div className="absolute inset-0 z-[5] flex h-full w-full items-center justify-center">
      <svg
        width="100%"
        height="180"
        viewBox="0 0 356 180"
        fill="none"
        preserveAspectRatio="none"
      >
        <rect width="356" height="180" fill={`url(#${id})`} />
        <defs>
          <radialGradient
            id={id}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(178 98) rotate(90) scale(98 178)"
          >
            <stop stopColor={color} stopOpacity="0.25" />
            <stop offset="0.34" stopColor={color} stopOpacity="0.15" />
            <stop offset="1" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PerformanceVisual — static area line chart                         */
/* ------------------------------------------------------------------ */

const PERF_DATA = [30, 35, 28, 42, 38, 50, 45, 58, 52, 65, 60, 72, 68, 78];

interface PerformanceVisualProps {
  mainColor?: string;
  secondaryColor?: string;
  gridColor?: string;
}

export function PerformanceVisual({
  mainColor = '#6366F1',
  secondaryColor = '#818CF8',
  gridColor = '#80808015',
}: PerformanceVisualProps) {
  const gradId = useId();
  const glowId = useId();

  const viewW = 356;
  const viewH = 150;
  const min = Math.min(...PERF_DATA);
  const max = Math.max(...PERF_DATA);
  const range = max - min || 1;
  const pad = 10;

  const points = PERF_DATA.map((v, i) => ({
    x: pad + (i / (PERF_DATA.length - 1)) * (viewW - pad * 2),
    y: pad + ((max - v) / range) * (viewH - pad * 2),
  }));

  const lineD = `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const areaD = `${lineD} L ${viewW - pad},${viewH} L ${pad},${viewH} Z`;

  return (
    <div className="relative h-[180px] w-full overflow-hidden rounded-t-lg">
      <EllipseGlow color={mainColor} id={glowId} />
      <GridLayer color={gridColor} />

      {/* Area chart */}
      <div className="absolute inset-0 z-[8] flex items-end justify-center">
        <svg
          width="100%"
          height="180"
          viewBox={`0 0 ${viewW} ${viewH + 30}`}
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={mainColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={mainColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#${gradId})`} />
          <path
            d={lineD}
            fill="none"
            stroke={mainColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dot on last point */}
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={4}
            fill={mainColor}
            stroke="#0A0A0A"
            strokeWidth={2}
          />
        </svg>
      </div>

      {/* Badges */}
      <div className="absolute top-4 left-4 z-[9] flex items-center gap-1">
        <div className="flex shrink-0 items-center rounded-full border border-border bg-background-card/50 px-1.5 py-0.5 backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: mainColor }} />
          <span className="ml-1 text-[10px] text-foreground tabular-nums">+12.4%</span>
        </div>
        <div className="flex shrink-0 items-center rounded-full border border-border bg-background-card/50 px-1.5 py-0.5 backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
          <span className="ml-1 text-[10px] text-foreground tabular-nums">30d</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AllocationVisual — static donut chart                              */
/* ------------------------------------------------------------------ */

const ALLOC_DATA = [
  { label: 'cUSD', pct: 40, color: '#6366F1' },
  { label: 'cEUR', pct: 25, color: '#10B981' },
  { label: 'cBRL', pct: 20, color: '#F59E0B' },
  { label: 'cKES', pct: 15, color: '#EF4444' },
];

interface AllocationVisualProps {
  gridColor?: string;
}

export function AllocationVisual({ gridColor = '#80808015' }: AllocationVisualProps) {
  const glowId = useId();

  const cx = 178;
  const cy = 90;
  const r = 55;
  const innerR = 32;

  function getSlicePath(
    startAngle: number,
    endAngle: number,
    outerR: number,
    holeR: number,
  ) {
    const x1 = cx + Math.cos(startAngle) * outerR;
    const y1 = cy + Math.sin(startAngle) * outerR;
    const x2 = cx + Math.cos(endAngle) * outerR;
    const y2 = cy + Math.sin(endAngle) * outerR;
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    const ix1 = cx + Math.cos(endAngle) * holeR;
    const iy1 = cy + Math.sin(endAngle) * holeR;
    const ix2 = cx + Math.cos(startAngle) * holeR;
    const iy2 = cy + Math.sin(startAngle) * holeR;

    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${holeR} ${holeR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
  }

  let angle = -Math.PI / 2;
  const slices = ALLOC_DATA.map((seg) => {
    const startAngle = angle;
    const sweep = (seg.pct / 100) * Math.PI * 2;
    angle += sweep;
    return { ...seg, startAngle, endAngle: angle };
  });

  return (
    <div className="relative h-[180px] w-full overflow-hidden rounded-t-lg">
      <EllipseGlow color="#6366F1" id={glowId} />
      <GridLayer color={gridColor} />

      <div className="absolute inset-0 z-[8] flex items-center justify-center">
        <svg width="100%" height="180" viewBox="0 0 356 180" preserveAspectRatio="xMidYMid meet">
          {slices.map((s, i) => (
            <path
              key={i}
              d={getSlicePath(s.startAngle, s.endAngle, r, innerR)}
              fill={s.color}
              fillOpacity={0.8}
            />
          ))}
          {/* Center text */}
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="fill-foreground text-sm font-bold"
          >
            4
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            className="fill-foreground-muted text-[9px]"
          >
            assets
          </text>
        </svg>
      </div>

      {/* Legend badges */}
      <div className="absolute top-4 left-4 z-[9] flex flex-wrap items-center gap-1">
        {ALLOC_DATA.map((seg) => (
          <div
            key={seg.label}
            className="flex shrink-0 items-center rounded-full border border-border bg-background-card/50 px-1.5 py-0.5 backdrop-blur-sm"
          >
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="ml-1 text-[10px] text-foreground">{seg.label}</span>
            <span className="ml-0.5 text-[10px] text-foreground-muted">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
