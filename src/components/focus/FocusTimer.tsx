import React, { useState } from 'react';
import { useFocusTimer } from '../../hooks/useFocusTimer';
import './styles/FocusTimer.css';

const PRESETS = [25, 40, 60];

const FocusTimer: React.FC = () => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(PRESETS[0]);

  const {
    state,
    remainingSeconds,
    totalSeconds,
    progress,
    start,
    pause,
    resume,
    reset,
  } = useFocusTimer(selectedMinutes, {
    onTick: (remaining) => {
      console.log('tick', remaining);
    },
    onFinish: () => {
      window.alert('Sesja Focus zakończona!');
    },
  });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    start(selectedMinutes);
  };

  const isRunning = state === 'running';
  const isPaused = state === 'paused';
  const isIdle = state === 'idle';
  const isFinished = state === 'finished';

  return (
    <div className="focus-timer">
      <h2 className="focus-timer__title">Focus Timer</h2>

      <div className="focus-timer__presets">
        {PRESETS.map((m) => (
          <button
            key={m}
            className={
              'focus-timer__preset' +
              (selectedMinutes === m ? ' focus-timer__preset--active' : '')
            }
            onClick={() => setSelectedMinutes(m)}
            disabled={isRunning}
          >
            {m} min
          </button>
        ))}
      </div>

      <div className="focus-timer__display">
        <div
            className="focus-timer__circle-progress"
            style={{ '--progress': progress } as React.CSSProperties}
        >
            <div className="focus-timer__circle-inner">
            {formatTime(remainingSeconds)}
            </div>
        </div>
        </div>

      <div className="focus-timer__controls">
        {isIdle || isFinished ? (
          <button className="focus-timer__btn primary" onClick={handleStart}>
            Start
          </button>
        ) : null}

        {isRunning && (
          <button className="focus-timer__btn" onClick={pause}>
            Pauza
          </button>
        )}

        {isPaused && (
          <button className="focus-timer__btn primary" onClick={resume}>
            Wznów
          </button>
        )}

        {(isPaused || isFinished) && (
          <button className="focus-timer__btn secondary" onClick={reset}>
            Reset
          </button>
        )}
      </div>

      <div className="focus-timer__state">
        Stan: <strong>{state}</strong> | Całkowity czas: {formatTime(totalSeconds)}
      </div>
    </div>
  );
};

export default FocusTimer;