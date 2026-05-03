const API_URL = 'http://localhost:3001/api';

export interface IActivitySession {
  id: string;
  activity_name: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  is_task: number;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

export const activityTrackerService = {
  async getSessions(): Promise<IActivitySession[]> {
    const response = await fetch(`${API_URL}/activity-sessions`);
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },

  async getActiveSession(): Promise<IActivitySession | null> {
    const response = await fetch(`${API_URL}/activity-sessions/active`);
    if (!response.ok) throw new Error('Failed to fetch active session');
    const data = await response.json();
    return data || null;
  },

  async startSession(activity_name: string, is_task: boolean = false, task_id?: string): Promise<IActivitySession> {
    const response = await fetch(`${API_URL}/activity-sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: Date.now().toString(),
        activity_name,
        is_task,
        task_id,
        duration_seconds: 0,
      }),
    });
    if (!response.ok) throw new Error('Failed to start session');
    return response.json();
  },

  async stopSession(sessionId: string, duration_seconds: number): Promise<IActivitySession> {
    const response = await fetch(`${API_URL}/activity-sessions/${sessionId}/stop`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_seconds }),
    });
    if (!response.ok) throw new Error('Failed to stop session');
    return response.json();
  },

  async updateSession(sessionId: string, duration_seconds: number): Promise<IActivitySession> {
    const response = await fetch(`${API_URL}/activity-sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_seconds }),
    });
    if (!response.ok) throw new Error('Failed to update session');
    return response.json();
  },

  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_URL}/activity-sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete session');
  },

  async renameSession(sessionId: string, activity_name: string): Promise<IActivitySession> {
    const response = await fetch(`${API_URL}/activity-sessions/${sessionId}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_name }),
    });
    if (!response.ok) throw new Error('Failed to rename session');
    return response.json();
  },

  async getTodayStats(): Promise<{ total_seconds: number; session_count: number }> {
    const response = await fetch(`${API_URL}/activity-stats/today`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },
};