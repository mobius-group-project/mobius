const API_URL = 'http://localhost:3001/api';

export interface IFocusSession {
  id: number;
  total_seconds: number;
  remaining_seconds: number;
  state: 'idle' | 'running' | 'paused' | 'finished' | 'stopped';
  is_completed: number;
  updated_at?: string;
}

export const focusTimerService = {
  async getActiveSession(): Promise<IFocusSession | null> {
    const response = await fetch(`${API_URL}/focus-session/active`);
    if (!response.ok) {
      throw new Error('Failed to fetch active focus session');
    }
    return response.json();
  },

  async startSession(durationSeconds: number): Promise<IFocusSession> {
    const response = await fetch(`${API_URL}/focus-session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_seconds: durationSeconds }),
    });
    if (!response.ok) {
      throw new Error('Failed to start focus session');
    }
    return response.json();
  },

  async updateSession(
    id: number,
    payload: {
      remaining_seconds?: number;
      state?: 'idle' | 'running' | 'paused' | 'finished' | 'stopped';
      is_completed?: boolean;
    },
  ): Promise<IFocusSession> {
    const response = await fetch(`${API_URL}/focus-session/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Failed to update focus session');
    }
    return response.json();
  },
};
