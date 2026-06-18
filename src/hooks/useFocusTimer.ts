/**
 * Core timer hook for the focus module.
 *
 * Manages countdown logic, persists session state to SQLite via focusTimerService,
 * and writes a lightweight snapshot to localStorage so the timer survives page reloads.
 *
 * Because the dashboard compact view (/`) and the full focus page (/focus) are on separate
 * routes and are never mounted at the same time, localStorage is sufficient for keeping
 * them in sync — whichever route mounts next simply reads the snapshot.
 */
import { useEffect, useRef, useState } from 'react';
import { focusTimerService } from '../services/focusTimerService';

/**
 * Module-level Set that tracks which session IDs have already triggered onFinish.
 * This guarantees onFinish fires exactly once per session even if two component instances
 * (dashboard + focus page) happen to be alive at the same time during a route transition.
 */
const finishedSessionIds = new Set<number>();

/** Possible states of the focus timer. */
export type TimerState = 'idle' | 'running' | 'paused' | 'finished';

/** Optional callbacks passed to useFocusTimer. */
interface UseFocusTimerOptions {
  /** Called every second while the timer is running. Receives the remaining time in seconds and progress as a 0–1 fraction. */
  onTick?: (remainingSeconds: number, progress: number) => void;
  /** Called once when the countdown reaches zero. Guaranteed to fire at most once per session regardless of how many instances are mounted. */
  onFinish?: () => void;
}

/** Values and controls returned by the hook. */
interface UseFocusTimerResult {
  /** Current timer state. */
  state: TimerState;
  /** Seconds remaining in the current session. */
  remainingSeconds: number;
  /** Total duration of the current session in seconds. */
  totalSeconds: number;
  /** How much of the session has elapsed as a fraction from 0 (start) to 1 (complete). */
  progress: number;
  /** Database ID of the active session. Null until the async INSERT resolves after start(). */
  sessionId: number | null;
  /** Starts a new session with the given duration in minutes. */
  start: (durationMinutes: number) => void;
  /** Pauses a running session and saves the remaining time to the database. */
  pause: () => void;
  /** Resumes a paused session from the last saved remaining time. */
  resume: () => void;
  /** Cancels the current session and returns to idle. */
  reset: () => void;
}

const STORAGE_KEY = 'mobius.focusTimer.v1';

/**
 * The timer snapshot written to localStorage on every state change.
 * Storing endTimestamp (an absolute wall-clock time) rather than a countdown value
 * means the remaining time stays correct even if the tab is backgrounded for a while.
 */
interface PersistedTimer {
  state: TimerState;
  totalSeconds: number;
  remainingSeconds: number;
  /** Unix timestamp (ms) at which remaining time reaches zero. Null when the timer is paused. */
  endTimestamp: number | null;
  sessionId: number | null;
}

/**
 * Manages a focus session timer with SQLite persistence and localStorage-based cross-route sync.
 *
 * @param initialMinutes - Default session length shown before the user starts. Defaults to 25.
 * @param options - Optional onTick and onFinish callbacks.
 * @returns Timer state and control functions.
 */
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

  // Keep the displayed duration in sync when the user changes initialMinutes while idle.
  useEffect(() => {
    if (state === 'idle') {
      const total = initialMinutes * 60;
      setTotalSeconds(total);
      setRemainingSeconds(total);
    }
  }, [initialMinutes, state]);

  const intervalRef = useRef<number | null>(null);
  const { onTick, onFinish } = options;
  // Storing callbacks in refs prevents the tick interval from restarting every render
  // when the parent component re-renders and passes a new function reference.
  const onTickRef = useRef(onTick);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onTickRef.current = onTick;
    onFinishRef.current = onFinish;
  }, [onTick, onFinish]);

  /** Writes the current timer snapshot to localStorage so it can be restored on the next mount. */
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

  /** Removes the localStorage snapshot — called when the session finishes or is reset. */
  const clearPersistedTimer = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  /** Stops the setInterval tick and clears the stored interval ID. */
  const clearIntervalRef = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  /**
   * Starts a new session for the given duration.
   * The UI starts immediately; the database INSERT happens asynchronously in the background.
   * If the INSERT fails (e.g. DB unavailable), the timer still runs — sessionId just stays null.
   */
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

  /**
   * Pauses the running timer.
   * Calculates remaining time from endTimestamp at the moment of pause
   * to avoid drift from interval jitter.
   */
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

  /** Resumes a paused session by computing a new endTimestamp from the saved remaining time. */
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

  /**
   * Cancels the current session and returns the timer to idle.
   * Completed sessions (state === 'finished') are preserved in the database;
   * only interrupted (running or paused) sessions are marked as 'stopped'.
   */
  const reset = () => {
    clearIntervalRef();
    setRemainingSeconds(totalSeconds);
    setState('idle');
    setEndTimestamp(null);
    clearPersistedTimer();

    if (sessionId !== null && (state === 'running' || state === 'paused')) {
      void focusTimerService.updateSession(sessionId, {
        remaining_seconds: remainingSeconds,
        state: 'stopped',
        is_completed: false,
      });
    }

    setSessionId(null);
  };

  /**
   * On mount, restores the timer from the previous session if one exists.
   * Strategy: localStorage is checked first because it survives a hard refresh and contains
   * the precise endTimestamp. The database is the fallback for cases where localStorage was
   * cleared or the app is opened on a new device.
   */
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

      // Fallback: restore from the database.
      try {
        const active = await focusTimerService.getActiveSession();
        if (!active || canceled) return;

        const total = active.total_seconds || 0;
        const remainingFromDb = active.remaining_seconds ?? total;

        setSessionId(active.id);
        setTotalSeconds(total);

        if (active.state === 'running') {
          // Subtract time elapsed since last DB write to correct for drift (timer ran while the app was closed).
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
        // No-op: if restore fails, the timer simply starts in idle state.
      }
    };

    void restore();

    return () => {
      canceled = true;
    };
  }, []);

  /**
   * Tick loop: fires every second while the timer is running.
   * Uses endTimestamp (absolute time) rather than decrementing a counter,
   * so the countdown stays accurate even when the tab is throttled by the browser.
   */
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

        // Deduplicate onFinish across instances using the module-level Set.
        const alreadyFinished = sessionId !== null && finishedSessionIds.has(sessionId);
        if (!alreadyFinished) {
          if (sessionId !== null) finishedSessionIds.add(sessionId);
          if (onFinishRef.current) onFinishRef.current();
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
    sessionId,
    start,
    pause,
    resume,
    reset,
  };
}
