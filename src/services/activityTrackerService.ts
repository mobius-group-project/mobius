/**
 * CRUD service for activity_sessions.
 * An activity session records a named block of work time, optionally linked to a task.
 * Only one session can be active (end_time IS NULL) at a time — startSession enforces this.
 * When a task-linked session stops, the elapsed seconds are accumulated into tasks.time_spent.
 */
import { getDb } from './db';

/** A row from the activity_sessions table. */
export interface IActivitySession {
  /** String timestamp used as the primary key (milliseconds since epoch as a string). */
  id: string;
  activity_name: string;
  /** ISO datetime when the session started. */
  start_time: string;
  /** ISO datetime when the session ended. Null while the session is still running. */
  end_time: string | null;
  duration_seconds: number;
  /** 0/1 integer — true when the session is linked to a task (SQLite has no boolean type). */
  is_task: number;
  /** Foreign key into tasks.id. Null for standalone (non-task) activities. */
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

export const activityTrackerService = {
  /** Returns all sessions ordered by most recently started. */
  async getSessions(): Promise<IActivitySession[]> {
    const db = await getDb();
    return db.select<IActivitySession[]>(
      'SELECT * FROM activity_sessions ORDER BY created_at DESC, start_time DESC'
    );
  },

  /** Returns the currently running session (end_time IS NULL), or null if none is active. */
  async getActiveSession(): Promise<IActivitySession | null> {
    const db = await getDb();
    const rows = await db.select<IActivitySession[]>(
      'SELECT * FROM activity_sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1'
    );
    return rows[0] ?? null;
  },

  /**
   * Starts a new activity session. Throws if a session is already active — the caller
   * must stop the current session before starting another.
   * When `is_task` is true, sets tasks.isRunning = 1 for the linked task.
   *
   * @param activity_name - Display name for the activity.
   * @param is_task - Whether this session is linked to a task.
   * @param task_id - Required when is_task is true; foreign key into tasks.id.
   */
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

  /**
   * Closes a running session by setting end_time and saving the final duration.
   * If the session is task-linked, accumulates duration_seconds into tasks.time_spent
   * and clears tasks.isRunning.
   */
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

  /**
   * Merges a short active session into a longer existing session of the same activity.
   * Adds `additionalSeconds` to `existingId`, updates the linked task's time_spent if applicable,
   * and deletes the active session record entirely.
   * Used when the user resumes an activity they already tracked earlier in the day.
   */
  async mergeSessions(existingId: string, additionalSeconds: number, activeSessionId: string): Promise<void> {
    const db = await getDb();
    await db.execute(
      'UPDATE activity_sessions SET duration_seconds = duration_seconds + ? WHERE id = ?',
      [additionalSeconds, existingId]
    );
    const active = await db.select<IActivitySession[]>('SELECT * FROM activity_sessions WHERE id = ?', [activeSessionId]);
    if (active[0]?.is_task && active[0]?.task_id) {
      const tasks = await db.select<any[]>('SELECT time_spent FROM tasks WHERE id = ?', [active[0].task_id]);
      const prev = tasks[0]?.time_spent ?? 0;
      await db.execute('UPDATE tasks SET time_spent = ?, isRunning = 0 WHERE id = ?', [prev + additionalSeconds, active[0].task_id]);
    }
    await db.execute('DELETE FROM activity_sessions WHERE id = ?', [activeSessionId]);
  },

  /**
   * Persists the current elapsed duration of a still-running session.
   * Only updates rows where end_time IS NULL to avoid overwriting a completed session.
   * Called periodically by useActivityTracker while the timer ticks.
   */
  async updateSession(sessionId: string, duration_seconds: number): Promise<IActivitySession> {
    const db = await getDb();
    await db.execute(
      'UPDATE activity_sessions SET duration_seconds=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND end_time IS NULL',
      [duration_seconds, sessionId]
    );
    const rows = await db.select<IActivitySession[]>('SELECT * FROM activity_sessions WHERE id = ?', [sessionId]);
    return rows[0];
  },

  /**
   * Deletes a session record. If the session was still running and task-linked,
   * clears tasks.isRunning first so the task doesn't remain stuck in "running" state.
   */
  async deleteSession(sessionId: string): Promise<void> {
    const db = await getDb();
    const sessions = await db.select<IActivitySession[]>('SELECT * FROM activity_sessions WHERE id = ?', [sessionId]);
    const session = sessions[0];
    if (session?.end_time === null && session.is_task && session.task_id) {
      await db.execute('UPDATE tasks SET isRunning=0 WHERE id=?', [session.task_id]);
    }
    await db.execute('DELETE FROM activity_sessions WHERE id = ?', [sessionId]);
  },

  /** Updates the display name of an existing session. */
  async renameSession(sessionId: string, activity_name: string): Promise<IActivitySession> {
    const db = await getDb();
    await db.execute(
      'UPDATE activity_sessions SET activity_name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [activity_name, sessionId]
    );
    const rows = await db.select<IActivitySession[]>('SELECT * FROM activity_sessions WHERE id = ?', [sessionId]);
    return rows[0];
  },

  /**
   * Returns aggregated stats for today: total tracked seconds and number of sessions.
   * Filters by the date portion of start_time using SQLite's date() function.
   */
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
