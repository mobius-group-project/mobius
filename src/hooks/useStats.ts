import { useState, useEffect, useCallback } from 'react';
import { statsService, type RangeStats, type WeeklyStat } from '../services/statsService';

export type DatePreset = 'today' | '7d' | '30d' | 'custom';

export interface DateRange {
  from: string;
  to: string;
}

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getPresetRange = (preset: DatePreset): DateRange => {
  const today = new Date();
  const todayStr = toISODate(today);

  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr };

    case '7d': {
      // Monday of current week
      const monday = new Date(today);
      const day = monday.getDay(); // 0=Sun, 1=Mon, …
      monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
      // Sunday of current week (always +6 from Monday)
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return { from: toISODate(monday), to: toISODate(sunday) };
    }

    case '30d': {
      // 1st → last day of current calendar month
      const y = today.getFullYear();
      const m = today.getMonth(); // 0-indexed
      const first = new Date(y, m, 1);
      const last  = new Date(y, m + 1, 0); // day 0 of next month = last day of this month
      return { from: toISODate(first), to: toISODate(last) };
    }

    default:
      return { from: todayStr, to: todayStr };
  }
};

interface UseStatsReturn {
  rangeStats: RangeStats | null;
  weeklyStats: WeeklyStat[];
  loading: boolean;
  error: string | null;
  preset: DatePreset;
  dateRange: DateRange;
  setPreset: (preset: DatePreset) => void;
  setDateRange: (range: DateRange) => void;
  refetch: () => void;
}

export const useStats = (): UseStatsReturn => {
  const [preset, setPresetState] = useState<DatePreset>('7d');
  const [dateRange, setDateRangeState] = useState<DateRange>(getPresetRange('7d'));
  const [rangeStats, setRangeStats] = useState<RangeStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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