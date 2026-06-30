/**
 * Hook for tracking named activity sessions with SQLite persistence.
 *
 * Design decisions:
 *   - `sessions` holds only completed sessions (end_time IS NOT NULL); the active session
 *     lives in `currentSession` separately.
 *   - Progress is saved to the DB every 10 seconds, but only when `seconds` has changed
 *     since the last save — `lastSavedSeconds` ref tracks this to skip no-op writes.
 *   - `isInitialized` ref prevents the initial load from running twice in React StrictMode
 *     (where effects fire twice on mount in development).
 *   - `stopTracking` checks whether a completed session with the same name already exists and
 *     merges into it instead of creating a duplicate record.
 *   - `executeStartTracking` closes any orphaned active DB session before inserting a new one,
 *     guarding against a stuck session left by a previous crash.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { activityTrackerService } from '../services/activityTrackerService';
import { getDb } from '../services/db';

/** Possible states of the activity tracker. */
export type TrackerState = 'idle' | 'running' | 'paused';
/** Severity level for transient toast notifications. */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** A camelCase view of an activity_sessions row as used in UI state. */
export interface ActivitySession {
  id: string;
  activityName: string;
  startTime: Date | null;
  /** Null while the session is still running. */
  endTime: Date | null;
  durationSeconds: number;
  isTask?: boolean;
  taskId?: string;
  createdAt: Date;
}

/** A transient notification shown in the tracker UI. Auto-dismissed after 3 seconds. */
export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

/** Pending state when the user tries to start a duplicate activity name. */
export interface DuplicateConfirmation {
  existingSession: ActivitySession;
  newActivityName: string;
  isTask: boolean;
  taskId?: string;
}

/** Return type of useActivityTracker. */
interface UseActivityTrackerReturn {
  /** Current tracker state. */
  state: TrackerState;
  /** The running session, or null when idle. */
  currentSession: ActivitySession | null;
  /** Completed sessions loaded from the DB. Does not include the active session. */
  sessions: ActivitySession[];
  /** Elapsed seconds for the current session, incremented each tick. */
  seconds: number;
  /** Active toast notifications. */
  toasts: ToastMessage[];
  /** Set when the user starts a session with a name matching a completed one — triggers a confirmation dialog. */
  duplicateConfirmation: DuplicateConfirmation | null;
  /** Validates the name and starts a new session, closing any orphaned active session first. */
  startTracking: (activityName: string, isTask?: boolean, taskId?: string) => Promise<void>;
  /** Resumes a previously completed session by starting a new one under the same name. */
  continueSession: (session: ActivitySession) => Promise<void>;
  /** Stops the running session; merges into an existing same-name record if one exists. */
  stopTracking: () => Promise<void>;
  /** Discards the active session entirely without saving its time. */
  resetTracking: () => Promise<void>;
  /** Returns the current elapsed time as an HH:MM:SS string. */
  getFormattedTime: () => string;
  /** Returns the total tracked seconds across all completed sessions that started today. */
  getTotalTimeToday: () => number;
  /** Manually dismisses a toast by ID. */
  removeToast: (id: number) => void;
  /** Clears the pending duplicate confirmation (confirm path). */
  confirmDuplicateCreate: () => void;
  /** Clears the pending duplicate confirmation (cancel path). */
  cancelDuplicateCreate: () => void;
  /** Renames a session; rejects if the new name is already taken. */
  renameSession: (sessionId: string, newName: string) => Promise<void>;
  /** Deletes a session; if it is the currently active session, resets the tracker without going through stopTracking. */
  deleteSession: (sessionId: string) => Promise<void>;
  /** Reloads all sessions from the DB and restores any active session. */
  loadSessionsFromDB: () => Promise<void>;
}

export const useActivityTracker = (): UseActivityTrackerReturn => {
  const [state, setState] = useState<TrackerState>('idle');
  const [currentSession, setCurrentSession] = useState<ActivitySession | null>(null);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [duplicateConfirmation, setDuplicateConfirmation] = useState<DuplicateConfirmation | null>(null);
  const intervalRef = useRef<number | null>(null);
  /** Auto-incrementing counter for unique toast IDs. */
  const toastIdRef = useRef(0);
  /** Last seconds value written to the DB — used to skip no-op updateSession calls. */
  const lastSavedSeconds = useRef(0);
  /** Guards against double-loading in React StrictMode where effects run twice on mount. */
  const isInitialized = useRef(false);

  /** Adds a toast notification and schedules its auto-removal after 3 seconds. */
  const addToast = useCallback((type: ToastType, message: string) => {
    const id = toastIdRef.current++;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /** Reloads completed sessions from the DB into `sessions` state. Active session is excluded. */
  const refreshSessions = useCallback(async () => {
    try {
      const dbSessions = await activityTrackerService.getSessions();
      setSessions(dbSessions
        .filter(s => s.end_time !== null)
        .map(s => ({
          id: s.id,
          activityName: s.activity_name,
          startTime: new Date(s.start_time),
          endTime: new Date(s.end_time!),
          durationSeconds: s.duration_seconds,
          isTask: Boolean(s.is_task),
          taskId: s.task_id || undefined,
          createdAt: new Date(s.created_at),
        })));
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
    }
  }, []);

  const loadSessionsFromDB = useCallback(async () => {
    try {
      const dbSessions = await activityTrackerService.getSessions();
      setSessions(dbSessions
        .filter(s => s.end_time !== null)
        .map(s => ({
          id: s.id,
          activityName: s.activity_name,
          startTime: new Date(s.start_time),
          endTime: new Date(s.end_time!),
          durationSeconds: s.duration_seconds,
          isTask: Boolean(s.is_task),
          taskId: s.task_id || undefined,
          createdAt: new Date(s.created_at),
        })));

      const activeDB = await activityTrackerService.getActiveSession();
      if (activeDB) {
        setCurrentSession({
          id: activeDB.id,
          activityName: activeDB.activity_name,
          startTime: new Date(activeDB.start_time),
          endTime: null,
          durationSeconds: activeDB.duration_seconds,
          isTask: Boolean(activeDB.is_task),
          taskId: activeDB.task_id || undefined,
          createdAt: new Date(activeDB.created_at),
        });
        setSeconds(activeDB.duration_seconds);
        setState('running');
      }
    } catch (error) {
      console.error('Failed to load sessions from DB:', error);
      addToast('error', 'Failed to load sessions from the database');
    }
  }, [addToast]);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      loadSessionsFromDB();
    }
  }, [loadSessionsFromDB]);

  /* Persist session progress every 10 seconds while running, but only when elapsed time changed. */
  useEffect(() => {
    if (state === 'running' && currentSession) {
      const interval = setInterval(async () => {
        if (seconds !== lastSavedSeconds.current) {
          try {
            await activityTrackerService.updateSession(currentSession.id, seconds);
            lastSavedSeconds.current = seconds;
          } catch (error) {
            console.error('Failed to save session progress:', error);
          }
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [state, currentSession, seconds]);

  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = window.setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

  const getFormattedTime = useCallback(() => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [seconds]);

  const getTotalTimeToday = useCallback(() => {
    const today = new Date().toDateString();
    return sessions
      .filter(s => s.startTime?.toDateString() === today)
      .reduce((total, s) => total + s.durationSeconds, 0);
  }, [sessions]);

  /**
   * Internal start implementation. Always closes any orphaned active session in the DB
   * before inserting the new one, so we can never end up with two active sessions.
   */
  const executeStartTracking = useCallback(async (
    activityName: string,
    isTask: boolean = false,
    taskId?: string
  ) => {
    try {
      const existingActive = await activityTrackerService.getActiveSession();
      if (existingActive) {
        await activityTrackerService.stopSession(existingActive.id, existingActive.duration_seconds);
      }

      const dbSession = await activityTrackerService.startSession(activityName, isTask, taskId);
      setCurrentSession({
        id: dbSession.id,
        activityName: dbSession.activity_name,
        startTime: new Date(dbSession.start_time),
        endTime: null,
        durationSeconds: 0,
        isTask,
        taskId,
        createdAt: new Date(dbSession.created_at),
      });
      setSeconds(0);
      setState('running');
      lastSavedSeconds.current = 0;
      addToast('success', `▶️ Started: ${activityName}`);
    } catch (error) {
      console.error('Failed to start session:', error);
      addToast('error', 'Failed to start session');
    }
  }, [addToast]);

  const startTracking = useCallback(async (
    activityName: string,
    isTask: boolean = false,
    taskId?: string
  ) => {
    if (!activityName.trim()) {
      addToast('warning', '✏️ Enter an activity name before starting!');
      return;
    }
    await executeStartTracking(activityName.trim(), isTask, taskId);
  }, [addToast, executeStartTracking]);

  const confirmDuplicateCreate = useCallback(() => {
    setDuplicateConfirmation(null);
  }, []);

  const cancelDuplicateCreate = useCallback(() => {
    setDuplicateConfirmation(null);
  }, []);

  const continueSession = useCallback(async (session: ActivitySession) => {
    await executeStartTracking(session.activityName, session.isTask || false, session.taskId);
  }, [executeStartTracking]);

  const stopTracking = useCallback(async () => {
    if (state === 'running' && currentSession) {
      try {
        const existing = sessions.find(
          s => s.activityName.toLowerCase() === currentSession.activityName.toLowerCase()
        );

        if (existing) {
          await activityTrackerService.mergeSessions(existing.id, seconds, currentSession.id);
        } else {
          await activityTrackerService.stopSession(currentSession.id, seconds);
        }

        await refreshSessions();

        if (currentSession.isTask && currentSession.taskId) {
          const db = await getDb();
          const rows = await db.select<{ time_spent: number }[]>(
            'SELECT time_spent FROM tasks WHERE id = ?',
            [currentSession.taskId]
          );
          const totalTime = rows[0]?.time_spent ?? 0;
          window.dispatchEvent(new CustomEvent('taskTimeUpdated', {
            detail: { taskId: currentSession.taskId, timeSpent: totalTime }
          }));
        }

        setCurrentSession(null);
        setSeconds(0);
        setState('idle');
        lastSavedSeconds.current = 0;
        addToast('success', '⏹️ Session ended and saved');
      } catch (error) {
        console.error('Failed to stop session:', error);
        addToast('error', 'Failed to stop session');
      }
    } else if (state === 'running') {
      setCurrentSession(null);
      setSeconds(0);
      setState('idle');
    }
  }, [state, currentSession, seconds, sessions, addToast, refreshSessions]);

  const resetTracking = useCallback(async () => {
    if (currentSession) {
      try {
        await activityTrackerService.deleteSession(currentSession.id);
      } catch (error) {
        console.error('Failed to delete session on reset:', error);
      }
    }
    setCurrentSession(null);
    setSeconds(0);
    setState('idle');
    lastSavedSeconds.current = 0;
  }, [currentSession]);

  const renameSession = useCallback(async (sessionId: string, newName: string) => {
    if (!newName.trim()) {
      addToast('warning', '✏️ Name cannot be empty!');
      return;
    }
    const trimmedName = newName.trim();
    const duplicate = sessions.find(
      s => s.id !== sessionId && s.activityName.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      addToast('warning', `⚠️ A session named "${trimmedName}" already exists!`);
      return;
    }
    try {
      await activityTrackerService.renameSession(sessionId, trimmedName);
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, activityName: trimmedName } : s
      ));
      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, activityName: trimmedName } : null);
      }
      addToast('success', `✅ Renamed to "${trimmedName}"`);
    } catch (error) {
      console.error('Failed to rename session:', error);
      addToast('error', 'Failed to rename session');
    }
  }, [sessions, currentSession, addToast]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (currentSession?.id === sessionId) {
      // Delete directly from the DB without calling stopTracking to avoid a double-delete.
      try {
        await activityTrackerService.deleteSession(sessionId);
      } catch (error) {
        console.error('Failed to delete active session:', error);
      }
      setCurrentSession(null);
      setSeconds(0);
      setState('idle');
      lastSavedSeconds.current = 0;
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      addToast('success', '🗑️ Session deleted');
      return;
    }
    try {
      await activityTrackerService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      addToast('success', '🗑️ Session deleted');
    } catch (error) {
      console.error('Failed to delete session:', error);
      addToast('error', 'Failed to delete session');
    }
  }, [currentSession, addToast]);

  return {
    state,
    currentSession,
    sessions,
    seconds,
    toasts,
    duplicateConfirmation,
    startTracking,
    continueSession,
    stopTracking,
    resetTracking,
    getFormattedTime,
    getTotalTimeToday,
    removeToast,
    confirmDuplicateCreate,
    cancelDuplicateCreate,
    renameSession,
    deleteSession,
    loadSessionsFromDB,
  };
};