/**
 * Hook for the statistics page. Manages the selected date range and fetches
 * aggregated analytics from statsService whenever the range changes.
 *
 * Preset logic:
 *   - 'today'  → current calendar day
 *   - '7d'     → Monday–Sunday of the current week
 *   - '30d'    → first to last day of the current calendar month
 *   - 'custom' → set by calling setDateRange() directly
 *
 * Calling setPreset() with a non-custom value automatically recalculates dateRange.
 * Calling setDateRange() directly switches the preset to 'custom'.
 */
import { useState, useEffect, useCallback } from 'react';
import { statsService, type RangeStats, type WeeklyStat } from '../services/statsService';

/** Named time range options available in the stats page date picker. */
export type DatePreset = 'today' | '7d' | '30d' | 'custom';

/** Inclusive date range used to query the stats service. */
export interface DateRange {
  /** Start date as ISO string (YYYY-MM-DD). */
  from: string;
  /** End date as ISO string (YYYY-MM-DD). */
  to: string;
}

/** Formats a Date object as a YYYY-MM-DD string without timezone conversion. */
const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Converts a preset label into a concrete date range.
 * '7d' spans Monday–Sunday of the current week (not a rolling 7 days).
 * '30d' spans the full current calendar month (not a rolling 30 days).
 *
 * @param preset - The selected preset label.
 * @returns A `DateRange` with `from` and `to` ISO date strings.
 */
const getPresetRange = (preset: DatePreset): DateRange => {
  const today = new Date();
  const todayStr = toISODate(today);

  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr };

    case '7d': {
      // Monday of the current week — getDay() returns 0 for Sunday, so we wrap it.
      const monday = new Date(today);
      const day = monday.getDay();
      monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return { from: toISODate(monday), to: toISODate(sunday) };
    }

    case '30d': {
      const y = today.getFullYear();
      const m = today.getMonth();
      const first = new Date(y, m, 1);
      // Day 0 of next month resolves to the last day of this month.
      const last = new Date(y, m + 1, 0);
      return { from: toISODate(first), to: toISODate(last) };
    }

    default:
      return { from: todayStr, to: todayStr };
  }
};

/** Return type of useStats. */
interface UseStatsReturn {
  /** Analytics for the selected date range, or null while loading. */
  rangeStats: RangeStats | null;
  /** Per-week totals for the last 8 weeks — always shown regardless of preset. */
  weeklyStats: WeeklyStat[];
  loading: boolean;
  error: string | null;
  /** Currently active preset label. */
  preset: DatePreset;
  /** The resolved date range corresponding to the active preset. */
  dateRange: DateRange;
  /** Switches to a preset and recalculates dateRange (no-op for 'custom'). */
  setPreset: (preset: DatePreset) => void;
  /** Sets an arbitrary date range and switches preset to 'custom'. */
  setDateRange: (range: DateRange) => void;
  /** Re-runs the fetch for the current dateRange. */
  refetch: () => void;
}

/**
 * Provides statistics data and date range controls for the statistics page.
 * Fetches both range stats and 8-week history in parallel on every range change.
 */
export const useStats = (): UseStatsReturn => {
  const [preset, setPresetState] = useState<DatePreset>('7d');
  const [dateRange, setDateRangeState] = useState<DateRange>(getPresetRange('7d'));
  const [rangeStats, setRangeStats] = useState<RangeStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetches range stats and weekly stats in parallel for the given date range. */
  const fetchStats = useCallback(async (range: DateRange) => {
    setLoading(true);
    setError(null);
    try {
      const [range_, weekly] = await Promise.all([
        statsService.getRangeStats(range.from, range.to),
        statsService.getWeeklyStats(8),
      ]);
      setRangeStats(range_);
      setWeeklyStats(weekly);
    } catch (err) {
      setError('Nie udało się załadować statystyk');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(dateRange);
  }, [dateRange, fetchStats]);

  const setPreset = useCallback((p: DatePreset) => {
    setPresetState(p);
    if (p !== 'custom') {
      setDateRangeState(getPresetRange(p));
    }
  }, []);

  const setDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range);
    setPresetState('custom');
  }, []);

  return {
    rangeStats,
    weeklyStats,
    loading,
    error,
    preset,
    dateRange,
    setPreset,
    setDateRange,
    refetch: () => fetchStats(dateRange),
  };
};