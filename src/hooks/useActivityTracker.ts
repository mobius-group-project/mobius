import { useState, useRef, useEffect, useCallback } from 'react';
import { activityTrackerService } from '../services/activityTrackerService';

export type TrackerState = 'idle' | 'running' | 'paused';
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ActivitySession {
  id: string;
  activityName: string;
  startTime: Date | null;
  endTime: Date | null;
  durationSeconds: number;
  isTask?: boolean;
  taskId?: string;
  createdAt: Date;
}

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

export interface DuplicateConfirmation {
  existingSession: ActivitySession;
  newActivityName: string;
  isTask: boolean;
  taskId?: string;
}

interface UseActivityTrackerReturn {
  state: TrackerState;
  currentSession: ActivitySession | null;
  sessions: ActivitySession[];
  seconds: number;
  toasts: ToastMessage[];
  duplicateConfirmation: DuplicateConfirmation | null;
  startTracking: (activityName: string, isTask?: boolean, taskId?: string) => Promise<void>;
  continueSession: (session: ActivitySession) => Promise<void>;
  stopTracking: () => Promise<void>;
  resetTracking: () => Promise<void>;
  getFormattedTime: () => string;
  getTotalTimeToday: () => number;
  removeToast: (id: number) => void;
  confirmDuplicateCreate: () => void;
  cancelDuplicateCreate: () => void;
  renameSession: (sessionId: string, newName: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
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
  const toastIdRef = useRef(0);
  const lastSavedSeconds = useRef(0);
  const isInitialized = useRef(false);

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
      addToast('error', 'Nie udało się załadować sesji z bazy danych');
    }
  }, [addToast]);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      loadSessionsFromDB();
    }
  }, [loadSessionsFromDB]);

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

  const getUniqueActivityName = useCallback((
    baseName: string,
    existingSessions: ActivitySession[],
  ): string => {
    const existingNames = existingSessions.map(s => s.activityName.toLowerCase());
    if (!existingNames.includes(baseName.toLowerCase())) return baseName;
    let counter = 1;
    let newName = `${baseName}(${counter})`;
    while (existingNames.includes(newName.toLowerCase())) {
      counter++;
      newName = `${baseName}(${counter})`;
    }
    return newName;
  }, []);

  // ИСПРАВЛЕНИЕ 1: перед стартом всегда закрываем любую активную сессию в БД
  const executeStartTracking = useCallback(async (
    activityName: string,
    isTask: boolean = false,
    taskId?: string
  ) => {
    try {
      // Проверяем не осталась ли в БД незакрытая сессия
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
      addToast('success', `▶️ Rozpoczęto: ${activityName}`);
    } catch (error) {
      console.error('Failed to start session:', error);
      addToast('error', 'Nie udało się rozpocząć sesji');
    }
  }, [addToast]);

  const startTracking = useCallback(async (
    activityName: string,
    isTask: boolean = false,
    taskId?: string
  ) => {
    if (!activityName.trim()) {
      addToast('warning', '✏️ Wpisz nazwę aktywności przed rozpoczęciem!');
      return;
    }

    const trimmedName = activityName.trim();

    const existingSession = sessions.find(
      s => s.activityName.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingSession) {
      setDuplicateConfirmation({
        existingSession,
        newActivityName: trimmedName,
        isTask,
        taskId,
      });
      return;
    }

    await executeStartTracking(trimmedName, isTask, taskId);
  }, [sessions, addToast, executeStartTracking]);

  const confirmDuplicateCreate = useCallback(() => {
    if (!duplicateConfirmation) return;
    const { newActivityName, isTask, taskId } = duplicateConfirmation;
    const uniqueName = getUniqueActivityName(newActivityName, sessions);
    executeStartTracking(uniqueName, isTask, taskId);
    setDuplicateConfirmation(null);
  }, [duplicateConfirmation, sessions, getUniqueActivityName, executeStartTracking]);

  const cancelDuplicateCreate = useCallback(() => {
    if (!duplicateConfirmation) return;
    const { existingSession } = duplicateConfirmation;
    if (state === 'running') {
      addToast('warning', '⏸️ Najpierw zatrzymaj bieżącą sesję');
      setDuplicateConfirmation(null);
      return;
    }
    executeStartTracking(
      existingSession.activityName,
      existingSession.isTask || false,
      existingSession.taskId
    );
    setDuplicateConfirmation(null);
  }, [duplicateConfirmation, state, addToast, executeStartTracking]);

  // ИСПРАВЛЕНИЕ 2: continueSession напрямую через executeStartTracking
  // executeStartTracking сам закроет любую активную сессию в БД
  const continueSession = useCallback(async (session: ActivitySession) => {
    await executeStartTracking(session.activityName, session.isTask || false, session.taskId);
  }, [executeStartTracking]);

  const stopTracking = useCallback(async () => {
    if (state === 'running' && currentSession) {
      try {
        await activityTrackerService.stopSession(currentSession.id, seconds);
        await refreshSessions();

        if (currentSession.isTask && currentSession.taskId) {
          window.dispatchEvent(new CustomEvent('taskTimeUpdated', {
            detail: { taskId: currentSession.taskId, timeSpent: seconds }
          }));
        }

        setCurrentSession(null);
        setSeconds(0);
        setState('idle');
        lastSavedSeconds.current = 0;
        addToast('success', '⏹️ Sesja zakończona i zapisana');
      } catch (error) {
        console.error('Failed to stop session:', error);
        addToast('error', 'Nie udało się zakończyć sesji');
      }
    } else if (state === 'running') {
      setCurrentSession(null);
      setSeconds(0);
      setState('idle');
    }
  }, [state, currentSession, seconds, addToast, refreshSessions]);

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
      addToast('warning', '✏️ Nazwa nie może być pusta!');
      return;
    }
    const trimmedName = newName.trim();
    const duplicate = sessions.find(
      s => s.id !== sessionId && s.activityName.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      addToast('warning', `⚠️ Sesja o nazwie "${trimmedName}" już istnieje!`);
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
      addToast('success', `✅ Zmieniono nazwę na "${trimmedName}"`);
    } catch (error) {
      console.error('Failed to rename session:', error);
      addToast('error', 'Nie udało się zmienić nazwy sesji');
    }
  }, [sessions, currentSession, addToast]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (currentSession?.id === sessionId) {
      // Удаляем из БД напрямую, без stopTracking чтобы не было двойного удаления
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
      addToast('success', '🗑️ Sesja usunięta');
      return;
    }
    try {
      await activityTrackerService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      addToast('success', '🗑️ Sesja usunięta');
    } catch (error) {
      console.error('Failed to delete session:', error);
      addToast('error', 'Nie udało się usunąć sesji');
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