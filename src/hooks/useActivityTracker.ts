import { useState, useRef, useEffect, useCallback } from 'react';
import { activityTrackerService } from '../services/activityTrackerService';
//import { taskService } from '../services/taskService';
import { formatDurationDetailed } from '../components/TimeFormatter';

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
  resetTracking: () => void;
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

  const loadSessionsFromDB = useCallback(async () => {
    try {
      const dbSessions = await activityTrackerService.getSessions();
      const mappedSessions: ActivitySession[] = dbSessions.map(s => ({
        id: s.id,
        activityName: s.activity_name,
        startTime: new Date(s.start_time),
        endTime: s.end_time ? new Date(s.end_time) : null,
        durationSeconds: s.duration_seconds,
        isTask: Boolean(s.is_task),
        taskId: s.task_id || undefined,
        createdAt: new Date(s.created_at),
      }));
      setSessions(mappedSessions);

      // Sprawdź czy jest aktywna sesja
      const activeDB = await activityTrackerService.getActiveSession();
      if (activeDB && !currentSession) {
        const activeSession: ActivitySession = {
          id: activeDB.id,
          activityName: activeDB.activity_name,
          startTime: new Date(activeDB.start_time),
          endTime: null,
          durationSeconds: activeDB.duration_seconds,
          isTask: Boolean(activeDB.is_task),
          taskId: activeDB.task_id || undefined,
          createdAt: new Date(activeDB.created_at),
        };
        setCurrentSession(activeSession);
        setSeconds(activeDB.duration_seconds);
        setState('running');
      }
    } catch (error) {
      console.error('Failed to load sessions from DB:', error);
      addToast('error', 'Nie udało się załadować sesji z bazy danych');
    }
  }, [currentSession, addToast]);

  useEffect(() => {
    loadSessionsFromDB();
  }, [loadSessionsFromDB]);

  // Zapisz aktualizacje czasu do DB co 10 sekund
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

  const getUniqueActivityName = useCallback((baseName: string, existingSessions: ActivitySession[], excludeId?: string): string => {
    const existingNames = existingSessions
      .filter(s => s.id !== excludeId)
      .map(s => s.activityName.toLowerCase());
    
    if (!existingNames.includes(baseName.toLowerCase())) {
      return baseName;
    }
    
    let counter = 1;
    let newName = `${baseName}(${counter})`;
    
    while (existingNames.includes(newName.toLowerCase())) {
      counter++;
      newName = `${baseName}(${counter})`;
    }
    
    return newName;
  }, []);

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
      
      setSessions(prev => prev.map(session => {
        if (session.id === sessionId) {
          return { ...session, activityName: trimmedName };
        }
        return session;
      }));

      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, activityName: trimmedName } : null);
      }
      
      addToast('success', `✅ Zmieniono nazwę na "${trimmedName}"`);
    } catch (error) {
      console.error('Failed to rename session:', error);
      addToast('error', 'Nie udało się zmienić nazwy sesji');
    }
  }, [sessions, currentSession, addToast]);

  const executeStartTracking = useCallback(async (
    activityName: string, 
    isTask: boolean = false, 
    taskId?: string
  ) => {
    try {
      const dbSession = await activityTrackerService.startSession(activityName, isTask, taskId);
      
      const newSession: ActivitySession = {
        id: dbSession.id,
        activityName: dbSession.activity_name,
        startTime: new Date(dbSession.start_time),
        endTime: null,
        durationSeconds: dbSession.duration_seconds,
        isTask,
        taskId,
        createdAt: new Date(dbSession.created_at),
      };

      setCurrentSession(newSession);
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
    
    const { existingSession, newActivityName, isTask, taskId } = duplicateConfirmation;
    const uniqueName = getUniqueActivityName(newActivityName, sessions);
    
    addToast('warning', `⚠️ Sesja "${existingSession.activityName}" już istnieje (${formatDurationDetailed(existingSession.durationSeconds)}). Tworzę nową: "${uniqueName}"`);
    
    executeStartTracking(uniqueName, isTask, taskId);
    setDuplicateConfirmation(null);
  }, [duplicateConfirmation, sessions, getUniqueActivityName, addToast, executeStartTracking]);

  const cancelDuplicateCreate = useCallback(() => {
    if (!duplicateConfirmation) return;
    
    const { existingSession } = duplicateConfirmation;
    
    if (state === 'running') {
      addToast('warning', '⏸️ Najpierw zatrzymaj bieżącą sesję');
      setDuplicateConfirmation(null);
      return;
    }

    executeStartTracking(existingSession.activityName, existingSession.isTask || false, existingSession.taskId);
    setDuplicateConfirmation(null);
  }, [duplicateConfirmation, state, addToast, executeStartTracking]);

  const continueSession = useCallback(async (session: ActivitySession) => {
    if (state === 'running') {
      addToast('warning', '⏸️ Najpierw zatrzymaj bieżącą sesję');
      return;
    }

    await executeStartTracking(session.activityName, session.isTask || false, session.taskId);
  }, [state, addToast, executeStartTracking]);

  const stopTracking = useCallback(async () => {
    if (state === 'running' && currentSession) {
      try {
        await activityTrackerService.stopSession(currentSession.id, seconds);
        
        await loadSessionsFromDB();
        
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
  }, [state, currentSession, seconds, addToast, loadSessionsFromDB]);

  const resetTracking = useCallback(() => {
    if (state === 'running' && currentSession) {
      setCurrentSession(null);
      setSeconds(0);
      setState('idle');
    }
  }, [state, currentSession]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (currentSession?.id === sessionId) {
      await stopTracking();
    }
    
    try {
      await activityTrackerService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      addToast('success', '🗑️ Sesja usunięta');
    } catch (error) {
      console.error('Failed to delete session:', error);
      addToast('error', 'Nie udało się usunąć sesji');
    }
  }, [currentSession, stopTracking, addToast]);

  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = window.setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

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