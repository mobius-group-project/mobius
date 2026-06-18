/**
 * Read-only analytics service for the statistics page.
 * All queries aggregate data from activity_sessions; only completed sessions
 * (end_time IS NOT NULL) are included so in-progress time is not counted.
 */
import { getDb } from './db';

/** Aggregated totals for a single calendar day. */
export interface DailyStat {
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  total_seconds: number;
  session_count: number;
}

/** Total tracked time per unique activity name within a date range. */
export interface ActivityStat {
  activity_name: string;
  total_seconds: number;
  session_count: number;
}

/** Aggregated totals for a single ISO calendar week (YYYY-WWW). */
export interface WeeklyStat {
  /** SQLite strftime result: e.g. "2026-W24". */
  week: string;
  total_seconds: number;
  session_count: number;
  /** Number of distinct days within the week that had at least one session. */
  active_days: number;
}

/** High-level summary metrics for a date range. */
export interface RangeSummary {
  total_seconds: number;
  session_count: number;
  /** Duration of the single longest session in the range, in seconds. */
  longest_session: number;
  /** Mean session duration in seconds. */
  avg_session: number;
}

/** Full analytics payload returned for a selected date range. */
export interface RangeStats {
  summary: RangeSummary;
  /** Per-day breakdown, ordered chronologically. */
  daily: DailyStat[];
  /** Top 10 activities by total time, ordered descending. */
  topActivities: ActivityStat[];
}

export const statsService = {
  /**
   * Returns summary, per-day breakdown, and top-10 activities for a date range.
   *
   * @param from - Start date as ISO string (YYYY-MM-DD), inclusive.
   * @param to - End date as ISO string (YYYY-MM-DD), inclusive.
   */
  async getRangeStats(from: string, to: string): Promise<RangeStats> {
    const db = await getDb();
    const summary = await db.select<RangeSummary[]>(
      `SELECT COALESCE(SUM(duration_seconds), 0) AS total_seconds, COUNT(*) AS session_count,
              COALESCE(MAX(duration_seconds), 0) AS longest_session, COALESCE(AVG(duration_seconds), 0) AS avg_session
       FROM activity_sessions WHERE end_time IS NOT NULL AND date(start_time) >= ? AND date(start_time) <= ?`,
      [from, to]
    );
    const daily = await db.select<DailyStat[]>(
      `SELECT date(start_time) AS date, COALESCE(SUM(duration_seconds), 0) AS total_seconds, COUNT(*) AS session_count
       FROM activity_sessions WHERE end_time IS NOT NULL AND date(start_time) >= ? AND date(start_time) <= ?
       GROUP BY date(start_time) ORDER BY date(start_time) ASC`,
      [from, to]
    );
    const topActivities = await db.select<ActivityStat[]>(
      `SELECT activity_name, COALESCE(SUM(duration_seconds), 0) AS total_seconds, COUNT(*) AS session_count
       FROM activity_sessions WHERE end_time IS NOT NULL AND date(start_time) >= ? AND date(start_time) <= ?
       GROUP BY activity_name ORDER BY total_seconds DESC LIMIT 10`,
      [from, to]
    );
    return { summary: summary[0], daily, topActivities };
  },

  /**
   * Returns per-week aggregates for the last `weeks` calendar weeks.
   * Uses SQLite's strftime('%Y-W%W') to group by ISO week number.
   *
   * @param weeks - How many weeks back to include. Defaults to 8.
   */
  async getWeeklyStats(weeks = 8): Promise<WeeklyStat[]> {
    const db = await getDb();
    return db.select<WeeklyStat[]>(
      `SELECT strftime('%Y-W%W', start_time) AS week, COALESCE(SUM(duration_seconds), 0) AS total_seconds,
              COUNT(*) AS session_count, COUNT(DISTINCT date(start_time)) AS active_days
       FROM activity_sessions WHERE end_time IS NOT NULL AND start_time >= datetime('now', ? || ' days')
       GROUP BY strftime('%Y-W%W', start_time) ORDER BY week ASC`,
      [`-${weeks * 7}`]
    );
  },

  /** Returns total tracked seconds and session count for today. */
  async getTodayStats(): Promise<{ total_seconds: number; session_count: number }> {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];
    const rows = await db.select<any[]>(
      `SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds, COUNT(*) as session_count
       FROM activity_sessions WHERE date(start_time) = ?`,
      [today]
    );
    return rows[0];
  },
};
