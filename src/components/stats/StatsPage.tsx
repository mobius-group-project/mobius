import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useStats, type DatePreset } from '../../hooks/useStats';
import './styles/StatsPage.css';

// ─── helpers ─────────────────────────────────────────────────────────────────

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
  '7d': '7 dni',
  '30d': '30 dni',
  custom: 'Własny',
};

// ─── sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: string;
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

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      <div className="chart-tooltip__value">{formatSeconds(payload[0].value)}</div>
      {payload[0].payload.session_count !== undefined && (
        <div className="chart-tooltip__sub">
          {payload[0].payload.session_count} sesji
        </div>
      )}
    </div>
  );
};

// ─── main component ───────────────────────────────────────────────────────────

const StatsPage: React.FC = () => {
  const {
    rangeStats,
    loading,
    error,
    preset,
    dateRange,
    setPreset,
    setDateRange,
  } = useStats();

  // Fill missing dates with zeros so bar chart is continuous
  const filledDaily = useMemo(() => {
    if (!rangeStats) return [];
    const map = new Map(rangeStats.daily.map(d => [d.date, d]));
    const result = [];
    const cur = new Date(dateRange.from + 'T00:00:00');
    const end = new Date(dateRange.to + 'T00:00:00');
    while (cur <= end) {
      const iso = cur.toISOString().split('T')[0];
      result.push(map.get(iso) ?? { date: iso, total_seconds: 0, session_count: 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [rangeStats, dateRange]);

  const pieData = useMemo(() => {
    if (!rangeStats) return [];
    const top5 = rangeStats.topActivities.slice(0, 5);
    const rest = rangeStats.topActivities.slice(5);
    const restTotal = rest.reduce((s, a) => s + a.total_seconds, 0);
    const data = top5.map(a => ({ name: a.activity_name, value: a.total_seconds }));
    if (restTotal > 0) data.push({ name: 'Inne', value: restTotal });
    return data;
  }, [rangeStats]);

  const { summary } = rangeStats ?? {};
  const dayCount = useMemo(() => {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  }, [dateRange]);

  return (
    <div className="stats-page">
      {/* ── date range controls ─────────────────────────────────────── */}
      <div className="stats-toolbar">
        <div className="preset-buttons">
          {(Object.keys(PRESET_LABELS) as DatePreset[]).map(p => (
            <button
              key={p}
              className={`preset-btn ${preset === p ? 'preset-btn--active' : ''}`}
              onClick={() => setPreset(p)}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="date-inputs">
            <input
              type="date"
              className="date-input"
              value={dateRange.from}
              max={dateRange.to}
              onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
            />
            <span className="date-sep">–</span>
            <input
              type="date"
              className="date-input"
              value={dateRange.to}
              min={dateRange.from}
              onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* ── loading / error ─────────────────────────────────────────── */}
      {loading && (
        <div className="stats-loading">
          <span className="stats-loading__spinner" />
          Ładowanie statystyk…
        </div>
      )}

      {error && (
        <div className="stats-error">{error}</div>
      )}

      {!loading && rangeStats && (
        <>
          {/* ── summary cards ─────────────────────────────────────── */}
          <div className="stat-cards">
            <StatCard
              icon="⏱️"
              label="Łączny czas"
              value={formatSeconds(summary!.total_seconds)}
              sub={`śr. ${formatSeconds(Math.round(summary!.total_seconds / dayCount))} / dzień`}
            />
            <StatCard
              icon="🗂️"
              label="Liczba sesji"
              value={String(summary!.session_count)}
              sub={`śr. ${(summary!.session_count / dayCount).toFixed(1)} / dzień`}
            />
            <StatCard
              icon="🏆"
              label="Najdłuższa sesja"
              value={formatSeconds(summary!.longest_session)}
            />
            <StatCard
              icon="📊"
              label="Śr. długość sesji"
              value={
                summary!.session_count > 0
                  ? formatSeconds(Math.round(summary!.avg_session))
                  : '—'
              }
            />
          </div>

          {/* ── daily bar chart ────────────────────────────────────── */}
          {filledDaily.length > 1 && (
            <div className="stats-section">
              <h3 className="stats-section__title">Aktywność dzienna</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={filledDaily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={v => formatSeconds(v)}
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,.05)' }} />
                    <Bar dataKey="total_seconds" fill="#7c6af7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── top activities ─────────────────────────────────────── */}
          <div className="stats-two-col">
            {/* list */}
            <div className="stats-section stats-section--flex">
              <h3 className="stats-section__title">Top aktywności</h3>
              {rangeStats.topActivities.length === 0 ? (
                <p className="stats-empty">Brak danych w tym okresie.</p>
              ) : (
                <ul className="activity-list">
                  {rangeStats.topActivities.map((a, i) => {
                    const pct = summary!.total_seconds > 0
                      ? Math.round((a.total_seconds / summary!.total_seconds) * 100)
                      : 0;
                    return (
                      <li key={a.activity_name} className="activity-list__item">
                        <span
                          className="activity-list__dot"
                          style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="activity-list__name">{a.activity_name}</span>
                        <span className="activity-list__pct">{pct}%</span>
                        <span className="activity-list__time">{formatSeconds(a.total_seconds)}</span>
                        <div className="activity-list__bar-track">
                          <div
                            className="activity-list__bar-fill"
                            style={{
                              width: `${pct}%`,
                              background: CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* pie */}
            {pieData.length > 0 && (
              <div className="stats-section stats-section--flex">
                <h3 className="stats-section__title">Podział czasu</h3>
                <div className="chart-wrapper chart-wrapper--pie">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: unknown) => formatSeconds(Number(v))}
                        contentStyle={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                          color: 'var(--color-text)',
                          fontSize: 12,
                        }}
                      />
                      <Legend
                        formatter={(v) => (
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{v}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
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