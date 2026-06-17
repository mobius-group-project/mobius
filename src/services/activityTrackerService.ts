import { getDb } from './db';

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
    const db = await getDb();
    return db.select<IActivitySession[]>(
      'SELECT * FROM activity_sessions ORDER BY created_at DESC, start_time DESC'
    );
  },

  async getActiveSession(): Promise<IActivitySession | null> {
    const db = await getDb();
    const rows = await db.select<IActivitySession[]>(
      'SELECT * FROM activity_sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1'
    );
    return rows[0] ?? null;
  },

  async startSession(activity_name: string, is_task = false, task_id?: string): Promise<IActivitySession> {
    const db = await getDb();
    const active = await this.getActiveSession();
    if (active) throw new Error('An active session already exists');
    const id = Date.now().toString();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO activity_sessions (id, activity_name, start_time, duration_seconds, is_task, task_id, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
      [id, activity_name, now, is_task ? 1 : 0, task_id ?? null, now, now]
    );
    if (is_task && task_id) {
      await db.execute('UPDATE tasks SET isRunning = 1 WHERE id = ?', [task_id]);
    }
    const rows = await db.select<IActivitySession[]>('SELECT * FROM activity_sessions WHERE id = ?', [id]);
    return rows[0];
  },

  async stopSession(sessionId: string, duration_seconds: number): Promise<IActivitySession> {
    const db = await getDb();
    const sessions = await db.select<IActivitySession[]>('SELECT * FROM activity_sessions WHERE id = ?', [sessionId]);
    const session = sessions[0];
    if (!session) throw new Error('Session not found');
    const now = new Date().toISOString();
    await db.execute(
      'UPDATE activity_sessions SET end_time=?, duration_seconds=?, updated_at=? WHERE id=?',
      [now, duration_seconds, now, sessionId]
    );
    if (session.is_task && session.task_id) {
      const tasks = await db.select<any[]>('SELECT time_spent FROM tasks WHERE id = ?', [session.task_id]);
      const prev = tasks[0]?.time_spent ?? 0;
      await db.execute('UPDATE tasks SET time_spent=?, isRunning=0 WHERE id=?', [prev + duration_seconds, session.task_id]);
    }
    const rows = await db.select<IActivitySession[]>('SELECT * FROM activity_sessions WHERE id = ?', [sessionId]);
    return rows[0];
  },

  async updateSession(sessionId: string, duration_seconds: number): Promise<IActivitySession> {
    const db = await getDb();
    await db.execute(
      'UPDATE activity_sessions SET duration_seconds=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND end_time IS NULL',
      [duration_seconds, sessionId]
    );
    const rows = await db.select<IActivitySession[]>('SELECT * FROM activity_sessions WHERE id = ?', [sessionId]);
    return rows[0];
  },

  async deleteSession(sessionId: string): Promise<void> {
    const db = await getDb();
    const sessions = await db.select<IActivitySession[]>('SELECT * FROM activity_sessions WHERE id = ?', [sessionId]);
    const session = sessions[0];
    if (session?.end_time === null && session.is_task && session.task_id) {
      await db.execute('UPDATE tasks SET isRunning=0 WHERE id=?', [session.task_id]);
    }
    await db.execute('DELETE FROM activity_sessions WHERE id = ?', [sessionId]);
  },

  async renameSession(sessionId: string, activity_name: string): Promise<IActivitySession> {
    const db = await getDb();
    await db.execute(
      'UPDATE activity_sessions SET activity_name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [activity_name, sessionId]
    );
    const rows = await db.select<IActivitySession[]>('SELECT * FROM activity_sessions WHERE id = ?', [sessionId]);
    return rows[0];
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
