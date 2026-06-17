import { getDb } from './db';

export interface DailyStat {
  date: string;
  total_seconds: number;
  session_count: number;
}

export interface ActivityStat {
  activity_name: string;
  total_seconds: number;
  session_count: number;
}

export interface WeeklyStat {
  week: string;
  total_seconds: number;
  session_count: number;
  active_days: number;
}

export interface RangeSummary {
  total_seconds: number;
  session_count: number;
  longest_session: number;
  avg_session: number;
}

export interface RangeStats {
  summary: RangeSummary;
  daily: DailyStat[];
  topActivities: ActivityStat[];
}

export const statsService = {
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
