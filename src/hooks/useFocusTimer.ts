import { useEffect, useRef, useState } from 'react';

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

export function useFocusTimer(
  initialMinutes = 25,
  options: UseFocusTimerOptions = {}
): UseFocusTimerResult {
  const totalInitial = initialMinutes * 60;

  const [totalSeconds, setTotalSeconds] = useState(totalInitial);
  const [remainingSeconds, setRemainingSeconds] = useState(totalInitial);
  const [state, setState] = useState<TimerState>('idle');

  const intervalRef = useRef<number | null>(null);
  const { onTick, onFinish } = options;

  const clearIntervalRef = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = (durationMinutes: number) => {
    const total = durationMinutes * 60;
    setTotalSeconds(total);
    setRemainingSeconds(total);
    setState('running');
  };

  const pause = () => {
    if (state === 'running') {
      clearIntervalRef();
      setState('paused');
    }
  };

  const resume = () => {
    if (state === 'paused') {
      setState('running');
    }
  };

  const reset = () => {
    clearIntervalRef();
    setRemainingSeconds(totalSeconds);
    setState('idle');
  };

  useEffect(() => {
    if (state !== 'running') {
      clearIntervalRef();
      return;
    }

    const id = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearIntervalRef();
          setState('finished');
          if (onTick) {
            onTick(0, 1);
          }
          if (onFinish) {
            onFinish();
          }
          return 0;
        }

        const progress = 1 - next / totalSeconds;
        if (onTick) {
          onTick(next, progress);
        }
        return next;
      });
    }, 1000);

    intervalRef.current = id;

    return () => {
      clearIntervalRef();
    };
  }, [state, totalSeconds, onTick, onFinish]);

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