import { useEffect, useRef, useState } from 'react';
import { focusTimerService } from '../services/focusTimerService';

export type TimerState = 'idle' | 'running' | 'paused' | 'finished';

interface UseFocusTimerOptions {
  onTick?: (remainingSeconds: number, progress: number) => void;
  onFinish?: () => void;
}

interface UseFocusTimerResult {
  state: TimerState;
  remainingSeconds: number;
  totalSeconds: number;
  progress: number; // 0..1
  start: (durationMinutes: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

const STORAGE_KEY = 'mobius.focusTimer.v1';

interface PersistedTimer {
  state: TimerState;
  totalSeconds: number;
  remainingSeconds: number;
  endTimestamp: number | null;
  sessionId: number | null;
}

export function useFocusTimer(
  initialMinutes = 25,
  options: UseFocusTimerOptions = {}
): UseFocusTimerResult {
  const totalInitial = initialMinutes * 60;

  const [totalSeconds, setTotalSeconds] = useState(totalInitial);
  const [remainingSeconds, setRemainingSeconds] = useState(totalInitial);
  const [state, setState] = useState<TimerState>('idle');
  const [endTimestamp, setEndTimestamp] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    if (state === 'idle') {
      const total = initialMinutes * 60;
      setTotalSeconds(total);
      setRemainingSeconds(total);
    }
  }, [initialMinutes, state]);

  const intervalRef = useRef<number | null>(null);
  const { onTick, onFinish } = options;
  const onTickRef = useRef(onTick);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onTickRef.current = onTick;
    onFinishRef.current = onFinish;
  }, [onTick, onFinish]);

  const persistTimer = (
    nextState: TimerState,
    nextTotal: number,
    nextRemaining: number,
    nextEndTimestamp: number | null,
    nextSessionId: number | null,
  ) => {
    const payload: PersistedTimer = {
      state: nextState,
      totalSeconds: nextTotal,
      remainingSeconds: nextRemaining,
      endTimestamp: nextEndTimestamp,
      sessionId: nextSessionId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const clearPersistedTimer = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const clearIntervalRef = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = (durationMinutes: number) => {
    const total = durationMinutes * 60;
    const targetTimestamp = Date.now() + total * 1000;

    setTotalSeconds(total);
    setRemainingSeconds(total);
    setState('running');
    setEndTimestamp(targetTimestamp);
    setSessionId(null);
    persistTimer('running', total, total, targetTimestamp, null);

    void (async () => {
      try {
        const session = await focusTimerService.startSession(total);
        setSessionId(session.id);
        persistTimer('running', total, total, targetTimestamp, session.id);
      } catch {
        // Timer keeps running even if API is unreachable.
      }
    })();
  };

  const pause = () => {
    if (state !== 'running' || endTimestamp === null) return;

    clearIntervalRef();
    const nextRemaining = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));

    setRemainingSeconds(nextRemaining);
    setEndTimestamp(null);
    setState('paused');
    persistTimer('paused', totalSeconds, nextRemaining, null, sessionId);

    if (sessionId !== null) {
      void focusTimerService.updateSession(sessionId, {
        remaining_seconds: nextRemaining,
        state: 'paused',
      });
    }
  };

  const resume = () => {
    if (state !== 'paused') return;

    const targetTimestamp = Date.now() + remainingSeconds * 1000;
    setEndTimestamp(targetTimestamp);
    setState('running');
    persistTimer('running', totalSeconds, remainingSeconds, targetTimestamp, sessionId);

    if (sessionId !== null) {
      void focusTimerService.updateSession(sessionId, {
        remaining_seconds: remainingSeconds,
        state: 'running',
      });
    }
  };

  const reset = () => {
    clearIntervalRef();
    setRemainingSeconds(totalSeconds);
    setState('idle');
    setEndTimestamp(null);
    clearPersistedTimer();

    // Preserve completed session history; only close interrupted sessions.
    if (sessionId !== null && (state === 'running' || state === 'paused')) {
      void focusTimerService.updateSession(sessionId, {
        remaining_seconds: remainingSeconds,
        state: 'stopped',
        is_completed: false,
      });
    }

    setSessionId(null);
  };

  useEffect(() => {
    let canceled = false;

    const restore = async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const persisted = JSON.parse(raw) as PersistedTimer;
          if (canceled) return;

          setTotalSeconds(persisted.totalSeconds);
          setSessionId(persisted.sessionId);

          if (persisted.state === 'running' && persisted.endTimestamp !== null) {
            const nextRemaining = Math.max(
              0,
              Math.ceil((persisted.endTimestamp - Date.now()) / 1000),
            );

            if (nextRemaining <= 0) {
              setRemainingSeconds(0);
              setState('finished');
              setEndTimestamp(null);
              clearPersistedTimer();
              return;
            }

            const nextEndTimestamp = Date.now() + nextRemaining * 1000;
            setRemainingSeconds(nextRemaining);
            setState('running');
            setEndTimestamp(nextEndTimestamp);
            persistTimer(
              'running',
              persisted.totalSeconds,
              nextRemaining,
              nextEndTimestamp,
              persisted.sessionId,
            );
            return;
          }

          setRemainingSeconds(persisted.remainingSeconds);
          setState(persisted.state);
          setEndTimestamp(null);
          return;
        } catch {
          clearPersistedTimer();
        }
      }

      try {
        const active = await focusTimerService.getActiveSession();
        if (!active || canceled) return;

        const total = active.total_seconds || 0;
        const remainingFromDb = active.remaining_seconds ?? total;

        setSessionId(active.id);
        setTotalSeconds(total);

        if (active.state === 'running') {
          const updatedAt = active.updated_at ? Date.parse(active.updated_at) : NaN;
          const elapsed = Number.isNaN(updatedAt)
            ? 0
            : Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
          const nextRemaining = Math.max(0, remainingFromDb - elapsed);

          if (nextRemaining <= 0) {
            setRemainingSeconds(0);
            setState('finished');
            setEndTimestamp(null);
            return;
          }

          const nextEndTimestamp = Date.now() + nextRemaining * 1000;
          setRemainingSeconds(nextRemaining);
          setState('running');
          setEndTimestamp(nextEndTimestamp);
          persistTimer('running', total, nextRemaining, nextEndTimestamp, active.id);
          return;
        }

        if (active.state === 'paused') {
          setRemainingSeconds(remainingFromDb);
          setState('paused');
          setEndTimestamp(null);
          persistTimer('paused', total, remainingFromDb, null, active.id);
        }
      } catch {
        // No-op
      }
    };

    void restore();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== 'running' || endTimestamp === null) {
      clearIntervalRef();
      return;
    }

    const tick = () => {
      const next = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
      setRemainingSeconds(next);

      const nextProgress = totalSeconds === 0 ? 0 : 1 - next / totalSeconds;
      if (onTickRef.current) {
        onTickRef.current(next, nextProgress);
      }

      persistTimer('running', totalSeconds, next, endTimestamp, sessionId);

      if (next <= 0) {
        clearIntervalRef();
        setState('finished');
        setEndTimestamp(null);
        clearPersistedTimer();

        if (sessionId !== null) {
          void focusTimerService.updateSession(sessionId, {
            remaining_seconds: 0,
            state: 'finished',
            is_completed: true,
          });
        }

        if (onFinishRef.current) {
          onFinishRef.current();
        }
      }
    };

    tick();
    const id = window.setInterval(() => {
      tick();
    }, 1000);

    intervalRef.current = id;

    return () => {
      clearIntervalRef();
    };
  }, [state, totalSeconds, endTimestamp, sessionId]);

  const progress = totalSeconds === 0 ? 0 : 1 - remainingSeconds / totalSeconds;

  return {
    state,
    remainingSeconds,
    totalSeconds,
    progress,
    start,
    pause,
    resume,
    reset,
  };
}