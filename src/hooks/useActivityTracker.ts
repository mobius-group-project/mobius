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

interface UseActivityTrackerReturn {
  state: TrackerState;
  currentSession: ActivitySession | null;
  sessions: ActivitySession[];
  seconds: number;
  toasts: ToastMessage[];
  startTracking: (activityName: string, isTask?: boolean, taskId?: string) => void;
  continueSession: (session: ActivitySession) => void;
  stopTracking: () => void;
  resetTracking: () => void;
  getFormattedTime: () => string;
  getTotalTimeToday: () => number;
  removeToast: (id: number) => void;
}

export const useActivityTracker = (): UseActivityTrackerReturn => {
  const [state, setState] = useState<TrackerState>('idle');
  const [currentSession, setCurrentSession] = useState<ActivitySession | null>(null);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
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

  const startTracking = useCallback((
    activityName: string, 
    isTask: boolean = false, 
    taskId?: string
  ) => {
    if (!activityName.trim()) {
      addToast('warning', '✏️ Wpisz nazwę aktywności przed rozpoczęciem!');
      return;
    }

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
    
    if (existingSession) {
      addToast('success', `▶️ Kontynuacja zadania: "${activityName}" (${formatDurationDetailed(existingSession.durationSeconds)})`);
    } else {
      addToast('success', `🎯 Rozpoczęto: "${activityName}"`);
    }
  }, [sessions, addToast]);

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
    
    addToast('success', `▶️ Kontynuacja: "${session.activityName}" (${formatDurationDetailed(session.durationSeconds)})`);
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
        
        const formattedTime = formatDurationDetailed(seconds);
        const addedTimeReadable = formatDurationDetailed(newTimeAdded);
        
        if (newTimeAdded > 0 && currentSession.durationSeconds > 0) {
          addToast('success', `✅ Zaktualizowano: "${updatedSession.activityName}" (+${addedTimeReadable}, razem: ${formattedTime})`);
        } else {
          addToast('success', `✅ Zapisano: "${updatedSession.activityName}" - ${formattedTime}`);
        }
      } else {
        addToast('info', `⏱️ Nie dodano nowego czasu do "${currentSession.activityName}"`);
      }
      
      setCurrentSession(null);
      setSeconds(0);
      setState('idle');
    } else if (state === 'running') {
      setCurrentSession(null);
      setSeconds(0);
      setState('idle');
    }
  }, [state, currentSession, seconds, addToast]);

  const resetTracking = useCallback(() => {
    if (state === 'running' && currentSession) {
      const activityName = currentSession.activityName;
      setCurrentSession(null);
      setSeconds(0);
      setState('idle');
      addToast('info', `⟳ Zresetowano sesję: "${activityName}"`);
    } else if (state === 'idle' && seconds === 0) {
      addToast('info', '✨ Brak aktywnej sesji do zresetowania');
    }
  }, [state, currentSession, addToast, seconds]);

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
    startTracking,
    continueSession,
    stopTracking,
    resetTracking,
    getFormattedTime,
    getTotalTimeToday,
    removeToast,
  };
};