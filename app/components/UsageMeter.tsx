'use client';

export default function UsageMeter({
  daily,
  monthly,
}: {
  daily: { used: number; limit: number };
  monthly: { used: number; limit: number };
}) {
  const pct = Math.min(100, (daily.used / daily.limit) * 100 || 0);
  return (
    <div className="meter" aria-label="Usage">
      <span className="tiny">
        Today: <strong>{daily.used}</strong>/{daily.limit}
      </span>
      <div className="bar">
        <span style={{ width: pct + '%' }} />
      </div>
      <span className="tiny">
        Month: <strong>{monthly.used}</strong>/{monthly.limit}
      </span>
    </div>
  );
}
