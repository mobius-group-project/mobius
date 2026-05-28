import React, { useMemo } from 'react';
import { useStats, type DatePreset } from '../../hooks/useStats';
import './styles/StatsPage.css';

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatSeconds = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
};

const CHART_COLORS = [
  '#7c6af7', '#5bc4d1', '#f7a26a', '#5bd18a',
  '#f76a8a', '#a2d96a', '#f7d36a', '#6aaff7',
];

const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Dziś',
  '7d':  '7 dni',
  '30d': '30 dni',
  custom: 'Własny',
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string; value: string; sub?: string; icon: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon }) => (
  <div className="stat-card">
    <span className="stat-card__icon">{icon}</span>
    <div className="stat-card__body">
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  </div>
);

// ─── BarChart (SVG) ───────────────────────────────────────────────────────────

interface BarChartProps {
  data: { date: string; total_seconds: number; session_count: number }[];
}
const BarChartSVG: React.FC<BarChartProps> = ({ data }) => {
  const W = 700, H = 180, PAD = { top: 10, right: 8, bottom: 32, left: 52 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const max = Math.max(...data.map(d => d.total_seconds), 1);
  const barW = Math.max(4, (innerW / data.length) * 0.6);
  const gap  = innerW / data.length;

  // y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    val: max * f,
    y: innerH - innerH * f,
  }));

  // show every Nth label so they don't overlap
  const labelStep = data.length <= 7 ? 1 : data.length <= 14 ? 2 : Math.ceil(data.length / 7);

  const [hovered, setHovered] = React.useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}
      >
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* y-axis grid + labels */}
          {yTicks.map(({ val, y }) => (
            <g key={y}>
              <line x1={0} x2={innerW} y1={y} y2={y}
                stroke="var(--color-border,#2a2a3e)" strokeWidth={1} />
              <text x={-6} y={y + 4} textAnchor="end"
                fill="var(--color-text-secondary,#888)" fontSize={10}>
                {formatSeconds(Math.round(val))}
              </text>
            </g>
          ))}

          {/* bars */}
          {data.map((d, i) => {
            const barH = Math.max(2, (d.total_seconds / max) * innerH);
            const x = gap * i + gap / 2 - barW / 2;
            const y = innerH - barH;
            const isH = hovered === i;
            return (
              <g key={d.date}
                onMouseEnter={(e) => {
                  setHovered(i);
                  const rect = (e.currentTarget.closest('svg') as SVGSVGElement)
                    .getBoundingClientRect();
                  setTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top - 10,
                  });
                }}
              >
                <rect x={x} y={y} width={barW} height={barH}
                  fill={isH ? '#a89bfa' : '#7c6af7'}
                  rx={3} ry={3}
                  style={{ transition: 'fill 0.1s' }}
                />
              </g>
            );
          })}

          {/* x-axis labels */}
          {data.map((d, i) => {
            if (i % labelStep !== 0) return null;
            return (
              <text key={d.date}
                x={gap * i + gap / 2} y={innerH + 18}
                textAnchor="middle"
                fill="var(--color-text-secondary,#888)" fontSize={10}>
                {formatDate(d.date)}
              </text>
            );
          })}
        </g>
      </svg>

      {/* tooltip */}
      {hovered !== null && data[hovered] && (
        <div className="chart-tooltip" style={{
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: 'translate(-50%, -100%)',
        }}>
          <div className="chart-tooltip__label">{formatDate(data[hovered].date)}</div>
          <div className="chart-tooltip__value">{formatSeconds(data[hovered].total_seconds)}</div>
          <div className="chart-tooltip__sub">{data[hovered].session_count} sesji</div>
        </div>
      )}
    </div>
  );
};

// ─── DonutChart (SVG) ─────────────────────────────────────────────────────────

interface DonutProps {
  data: { name: string; value: number }[];
}
const DonutChartSVG: React.FC<DonutProps> = ({ data }) => {
  const R = 70, r = 44, CX = 100, CY = 100;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  const slices = useMemo(() => {
    let angle = -Math.PI / 2;
    return data.map((d, i) => {
      const sweep = (d.value / total) * 2 * Math.PI;
      const x1 = CX + R * Math.cos(angle);
      const y1 = CY + R * Math.sin(angle);
      angle += sweep;
      const x2 = CX + R * Math.cos(angle);
      const y2 = CY + R * Math.sin(angle);
      const xi1 = CX + r * Math.cos(angle);
      const yi1 = CY + r * Math.sin(angle);
      const xi2 = CX + r * Math.cos(angle - sweep);
      const yi2 = CY + r * Math.sin(angle - sweep);
      const large = sweep > Math.PI ? 1 : 0;
      const path = [
        `M ${x1} ${y1}`,
        `A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
        `L ${xi1} ${yi1}`,
        `A ${r} ${r} 0 ${large} 0 ${xi2} ${yi2}`,
        'Z',
      ].join(' ');
      return { path, color: CHART_COLORS[i % CHART_COLORS.length], name: d.name, value: d.value };
    });
  }, [data, total]);

  const [hovered, setHovered] = React.useState<number | null>(null);

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 200 200" width={180} height={180}>
        {slices.map((s, i) => (
          <path key={s.name} d={s.path}
            fill={s.color}
            opacity={hovered === null || hovered === i ? 1 : 0.45}
            style={{ transition: 'opacity 0.15s', cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {/* centre label */}
        {hovered !== null ? (
          <>
            <text x={CX} y={CY - 6} textAnchor="middle"
              fill="#fff" fontSize={11} fontWeight={600}>
              {formatSeconds(slices[hovered].value)}
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle"
              fill="var(--color-text-secondary,#aaa)" fontSize={9}>
              {slices[hovered].name.length > 12
                ? slices[hovered].name.slice(0, 11) + '…'
                : slices[hovered].name}
            </text>
          </>
        ) : (
          <text x={CX} y={CY + 5} textAnchor="middle"
            fill="var(--color-text-secondary,#aaa)" fontSize={11}>
            łącznie
          </text>
        )}
      </svg>

      {/* legend */}
      <ul className="donut-legend">
        {slices.map((s, i) => (
          <li key={s.name}
            className={`donut-legend__item ${hovered === i ? 'donut-legend__item--active' : ''}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="donut-legend__dot" style={{ background: s.color }} />
            <span className="donut-legend__name">{s.name}</span>
            <span className="donut-legend__val">{formatSeconds(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── main component ───────────────────────────────────────────────────────────

const StatsPage: React.FC = () => {
  const {
    rangeStats, loading, error,
    preset, dateRange,
    setPreset, setDateRange,
  } = useStats();

  const filledDaily = useMemo(() => {
    if (!rangeStats) return [];
    const map = new Map(rangeStats.daily.map(d => [d.date, d]));
    const result = [];
    const cur = new Date(dateRange.from + 'T00:00:00');
    const end = new Date(dateRange.to   + 'T00:00:00');
    while (cur <= end) {
      const iso = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
      result.push(map.get(iso) ?? { date: iso, total_seconds: 0, session_count: 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [rangeStats, dateRange]);

  const pieData = useMemo(() => {
    if (!rangeStats) return [];
    const top5 = rangeStats.topActivities.slice(0, 5);
    const rest  = rangeStats.topActivities.slice(5);
    const restTotal = rest.reduce((s, a) => s + a.total_seconds, 0);
    const data = top5.map(a => ({ name: a.activity_name, value: a.total_seconds }));
    if (restTotal > 0) data.push({ name: 'Inne', value: restTotal });
    return data;
  }, [rangeStats]);

  const { summary } = rangeStats ?? {};

  const dayCount = useMemo(() => {
    const from = new Date(dateRange.from);
    const to   = new Date(dateRange.to);
    return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  }, [dateRange]);

  return (
    <div className="stats-page">

      {/* ── toolbar ──────────────────────────────────────────────── */}
      <div className="stats-toolbar">
        <div className="preset-buttons">
          {(Object.keys(PRESET_LABELS) as DatePreset[]).map(p => (
            <button key={p}
              className={`preset-btn ${preset === p ? 'preset-btn--active' : ''}`}
              onClick={() => setPreset(p)}>
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="date-inputs">
            <input type="date" className="date-input"
              value={dateRange.from} max={dateRange.to}
              onChange={e => setDateRange({ ...dateRange, from: e.target.value })} />
            <span className="date-sep">–</span>
            <input type="date" className="date-input"
              value={dateRange.to} min={dateRange.from}
              onChange={e => setDateRange({ ...dateRange, to: e.target.value })} />
          </div>
        )}
      </div>

      {/* ── loading / error ───────────────────────────────────────── */}
      {loading && (
        <div className="stats-loading">
          <span className="stats-loading__spinner" />
          Ładowanie statystyk…
        </div>
      )}
      {error && <div className="stats-error">{error}</div>}

      {!loading && rangeStats && (
        <>
          {/* ── summary cards ────────────────────────────────────── */}
          <div className="stat-cards">
            <StatCard icon="⏱️" label="Łączny czas"
              value={formatSeconds(summary!.total_seconds)}
              sub={`śr. ${formatSeconds(Math.round(summary!.total_seconds / dayCount))} / dzień`} />
            <StatCard icon="🗂️" label="Liczba sesji"
              value={String(summary!.session_count)}
              sub={`śr. ${(summary!.session_count / dayCount).toFixed(1)} / dzień`} />
            <StatCard icon="🏆" label="Najdłuższa sesja"
              value={formatSeconds(summary!.longest_session)} />
            <StatCard icon="📊" label="Śr. długość sesji"
              value={summary!.session_count > 0
                ? formatSeconds(Math.round(summary!.avg_session)) : '—'} />
          </div>

          {/* ── bar chart ─────────────────────────────────────────── */}
          {filledDaily.length > 1 && (
            <div className="stats-section">
              <h3 className="stats-section__title">Aktywność dzienna</h3>
              <BarChartSVG data={filledDaily} />
            </div>
          )}

          {/* ── activities + donut ────────────────────────────────── */}
          <div className="stats-two-col">
            <div className="stats-section stats-section--flex">
              <h3 className="stats-section__title">Top aktywności</h3>
              {rangeStats.topActivities.length === 0
                ? <p className="stats-empty">Brak danych w tym okresie.</p>
                : (
                  <ul className="activity-list">
                    {rangeStats.topActivities.map((a, i) => {
                      const pct = summary!.total_seconds > 0
                        ? Math.round((a.total_seconds / summary!.total_seconds) * 100) : 0;
                      return (
                        <li key={a.activity_name} className="activity-list__item">
                          <span className="activity-list__dot"
                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="activity-list__name">{a.activity_name}</span>
                          <span className="activity-list__pct">{pct}%</span>
                          <span className="activity-list__time">{formatSeconds(a.total_seconds)}</span>
                          <div className="activity-list__bar-track">
                            <div className="activity-list__bar-fill"
                              style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
            </div>

            {pieData.length > 0 && (
              <div className="stats-section stats-section--flex">
                <h3 className="stats-section__title">Podział czasu</h3>
                <DonutChartSVG data={pieData} />
              </div>
            )}
          </div>
        </>
      )}

      {!loading && rangeStats && summary!.session_count === 0 && (
        <div className="stats-empty-state">
          <span>📭</span>
          <p>Brak sesji w wybranym okresie.</p>
        </div>
      )}
    </div>
  );
};

export default StatsPage;