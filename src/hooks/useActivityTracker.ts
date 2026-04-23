import { useState, useRef, useEffect, useCallback } from 'react';
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
  startTracking: (activityName: string, isTask?: boolean, taskId?: string) => void;
  continueSession: (session: ActivitySession) => void;
  stopTracking: () => void;
  resetTracking: () => void;
  getFormattedTime: () => string;
  getTotalTimeToday: () => number;
  removeToast: (id: number) => void;
  confirmDuplicateCreate: () => void;
  cancelDuplicateCreate: () => void;
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

  const getUniqueActivityName = useCallback((baseName: string, existingSessions: ActivitySession[]): string => {
    const existingNames = existingSessions.map(s => s.activityName.toLowerCase());
    
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

  const executeStartTracking = useCallback((
    activityName: string, 
    isTask: boolean = false, 
    taskId?: string
  ) => {
    let existingSession: ActivitySession | undefined;
    
    if (isTask && taskId) {
      existingSession = sessions.find(s => s.taskId === taskId);
    }

    const newSession: ActivitySession = {
      id: existingSession ? existingSession.id : Date.now().toString(),
      activityName: activityName.trim(),
      startTime: new Date(),
      endTime: null,
      durationSeconds: existingSession ? existingSession.durationSeconds : 0,
      isTask,
      taskId,
      createdAt: existingSession ? existingSession.createdAt : new Date(),
    };

    setCurrentSession(newSession);
    setSeconds(existingSession ? existingSession.durationSeconds : 0);
    setState('running');
  }, [sessions]);

  const startTracking = useCallback((
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

    executeStartTracking(trimmedName, isTask, taskId);
  }, [sessions, addToast, executeStartTracking]);

  const confirmDuplicateCreate = useCallback(() => {
    if (!duplicateConfirmation) return;
    
    const { existingSession, newActivityName, isTask, taskId } = duplicateConfirmation;
    const uniqueName = getUniqueActivityName(newActivityName, sessions);
    
    addToast('warning', `⚠️ Sesja "${existingSession.activityName}" już istnieje (${formatDurationDetailed(existingSession.durationSeconds)}). Tworzę nową: "${uniqueName}"`);
    
    executeStartTracking(uniqueName, isTask, taskId);
    setDuplicateConfirmation(null);
  }, [duplicateConfirmation, sessions, getUniqueActivityName, addToast, executeStartTracking, formatDurationDetailed]);

  const cancelDuplicateCreate = useCallback(() => {
    if (!duplicateConfirmation) return;
    
    const { existingSession } = duplicateConfirmation;
    
    if (state === 'running') {
      addToast('warning', '⏸️ Najpierw zatrzymaj bieżącą sesję');
      setDuplicateConfirmation(null);
      return;
    }

    setCurrentSession({
      ...existingSession,
      startTime: new Date(),
    });
    
    setSeconds(existingSession.durationSeconds);
    setState('running');
    
    setDuplicateConfirmation(null);
  }, [duplicateConfirmation, state, addToast]);

  const continueSession = useCallback((session: ActivitySession) => {
    if (state === 'running') {
      addToast('warning', '⏸️ Najpierw zatrzymaj bieżącą sesję');
      return;
    }

    setCurrentSession({
      ...session,
      startTime: new Date(),
    });
    
    setSeconds(session.durationSeconds);
    setState('running');
  }, [state, addToast]);

  const stopTracking = useCallback(() => {
    if (state === 'running' && currentSession) {
      const newTimeAdded = seconds - (currentSession.durationSeconds || 0);
      
      if (newTimeAdded > 0 || currentSession.durationSeconds === 0) {
        const updatedSession: ActivitySession = {
          ...currentSession,
          endTime: new Date(),
          durationSeconds: seconds,
        };

        setSessions(prev => {
          const exists = prev.some(s => s.id === currentSession.id);
          
          if (exists) {
            return prev.map(s => s.id === currentSession.id ? updatedSession : s);
          } else {
            return [updatedSession, ...prev];
          }
        });
      }
      
      setCurrentSession(null);
      setSeconds(0);
      setState('idle');
    } else if (state === 'running') {
      setCurrentSession(null);
      setSeconds(0);
      setState('idle');
    }
  }, [state, currentSession, seconds]);

  const resetTracking = useCallback(() => {
    if (state === 'running' && currentSession) {
      setCurrentSession(null);
      setSeconds(0);
      setState('idle');
    }
  }, [state, currentSession]);

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
  };
};