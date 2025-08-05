'use client';

import * as React from 'react';

type Usage = {
  used: number;
  limit: number;
};

type Props = {
  daily: Usage;
  monthly: Usage;
  className?: string;
  title?: string;
};

function clampPct(used: number, limit: number) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function barColor(pct: number) {
  if (pct > 90) return '#e53935';     // red
  if (pct >= 70) return '#fb8c00';    // orange
  return '#43a047';                   // green
}

const containerStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 12,
  background: 'white',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 8,
};

const titleStyle: React.CSSProperties = {
  fontWeight: 700,
  color: '#111',
  fontSize: 14,
};

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '80px 1fr auto',
  alignItems: 'center',
  gap: 12,
  marginBottom: 10,
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#333',
  whiteSpace: 'nowrap',
};

const trackStyle: React.CSSProperties = {
  width: '100%',
  height: 10,
  background: '#eee',
  borderRadius: 6,
  overflow: 'hidden',
};

const numberStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#333',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

export default function UsageMeter({
  daily,
  monthly,
  className,
  title = 'Usage',
}: Props) {
  const dailyPct = clampPct(daily.used, daily.limit);
  const monthlyPct = clampPct(monthly.used, monthly.limit);
  const nf = React.useMemo(() => new Intl.NumberFormat(), []);

  return (
    <div className={className} style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>{title}</div>
      </div>

      {/* Daily */}
      <div style={rowStyle}>
        <div style={labelStyle}>Today</div>
        <div
          style={trackStyle}
          role="progressbar"
          aria-label="Daily usage"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={dailyPct}
        >
          <div
            style={{
              width: `${dailyPct}%`,
              height: '100%',
              background: barColor(dailyPct),
              transition: 'width 200ms ease',
            }}
          />
        </div>
        <div style={numberStyle}>
          {nf.format(daily.used)} / {nf.format(daily.limit)} ({dailyPct}%)
        </div>
      </div>

      {/* Monthly */}
      <div style={rowStyle}>
        <div style={labelStyle}>This month</div>
        <div
          style={trackStyle}
          role="progressbar"
          aria-label="Monthly usage"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={monthlyPct}
        >
          <div
            style={{
              width: `${monthlyPct}%`,
              height: '100%',
              background: barColor(monthlyPct),
              transition: 'width 200ms ease',
            }}
          />
        </div>
        <div style={numberStyle}>
          {nf.format(monthly.used)} / {nf.format(monthly.limit)} ({monthlyPct}%)
        </div>
      </div>
    </div>
  );
}
