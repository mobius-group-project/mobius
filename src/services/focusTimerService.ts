import { getDb } from './db';

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
    const db = await getDb();
    const rows = await db.select<IFocusSession[]>(
      `SELECT * FROM focus_sessions WHERE state IN ('running', 'paused') ORDER BY updated_at DESC, id DESC LIMIT 1`
    );
    return rows[0] ?? null;
  },

  async startSession(durationSeconds: number): Promise<IFocusSession> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO focus_sessions (duration_planned, total_seconds, remaining_seconds, state, is_completed, updated_at, created_at)
       VALUES (?, ?, ?, 'running', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [durationSeconds, durationSeconds, durationSeconds]
    );
    const rows = await db.select<IFocusSession[]>('SELECT * FROM focus_sessions WHERE id = ?', [result.lastInsertId]);
    return rows[0];
  },

  async updateSession(
    id: number,
    payload: { remaining_seconds?: number; state?: IFocusSession['state']; is_completed?: boolean }
  ): Promise<IFocusSession> {
    const db = await getDb();
    await db.execute(
      `UPDATE focus_sessions SET
        remaining_seconds = COALESCE(?, remaining_seconds),
        state = COALESCE(?, state),
        is_completed = COALESCE(?, is_completed),
        ended_at = CASE WHEN COALESCE(?, state) = 'finished' THEN CURRENT_TIMESTAMP ELSE ended_at END,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        payload.remaining_seconds ?? null,
        payload.state ?? null,
        payload.is_completed !== undefined ? (payload.is_completed ? 1 : 0) : null,
        payload.state ?? null,
        id,
      ]
    );
    const rows = await db.select<IFocusSession[]>('SELECT * FROM focus_sessions WHERE id = ?', [id]);
    return rows[0];
  },
};
