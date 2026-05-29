const API_URL = 'http://localhost:3001/api';

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
    const response = await fetch(
      `${API_URL}/activity-stats/range?from=${from}&to=${to}`
    );
    if (!response.ok) throw new Error('Failed to fetch range stats');
    return response.json();
  },

  async getWeeklyStats(weeks = 8): Promise<WeeklyStat[]> {
    const response = await fetch(
      `${API_URL}/activity-stats/weekly?weeks=${weeks}`
    );
    if (!response.ok) throw new Error('Failed to fetch weekly stats');
    return response.json();
  },

  async getTodayStats(): Promise<{ total_seconds: number; session_count: number }> {
    const response = await fetch(`${API_URL}/activity-stats/today`);
    if (!response.ok) throw new Error('Failed to fetch today stats');
    return response.json();
  },
};