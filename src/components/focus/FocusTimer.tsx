import React, { useState, useEffect, useRef } from 'react';
import { useFocusTimer } from '../../hooks/useFocusTimer';
import { focusPlantService, type IFocusPlant } from '../../services/focusPlantService';
import './styles/FocusTimer.css';

// ─── plant data ───────────────────────────────────────────────────────────────

export type PlantType = 'flower' | 'cactus' | 'mushroom';

interface PlantDef {
  label: string;
  cols: number;
  rows: number;
  pixels: [number, number, string][];
}

const PLANTS: Record<PlantType, PlantDef> = {
  flower: {
    label: 'Kwiatek', cols: 11, rows: 13,
    pixels: [
      [5,12,'#4caf50'],[5,11,'#4caf50'],[5,10,'#4caf50'],[5,9,'#4caf50'],
      [5,8,'#4caf50'],[5,7,'#4caf50'],[5,6,'#4caf50'],
      [4,9,'#388e3c'],[3,9,'#388e3c'],[6,9,'#388e3c'],[7,9,'#388e3c'],
      [4,8,'#388e3c'],[3,7,'#388e3c'],[6,8,'#388e3c'],[7,7,'#388e3c'],
      [3,3,'#ff7043'],[4,2,'#ff7043'],[5,1,'#ff7043'],[6,2,'#ff7043'],[7,3,'#ff7043'],
      [2,4,'#ff7043'],[8,4,'#ff7043'],[2,5,'#ff7043'],[8,5,'#ff7043'],
      [3,6,'#ffb74d'],[4,6,'#ffb74d'],[6,6,'#ffb74d'],[7,6,'#ffb74d'],
      [5,4,'#fff176'],[5,5,'#fff176'],[4,4,'#fff176'],[6,4,'#fff176'],[4,5,'#fff176'],[6,5,'#fff176'],
    ],
  },
  cactus: {
    label: 'Kaktus', cols: 11, rows: 14,
    pixels: [
      [5,13,'#388e3c'],[5,12,'#388e3c'],[5,11,'#388e3c'],[5,10,'#388e3c'],
      [5,9,'#388e3c'],[5,8,'#388e3c'],[5,7,'#388e3c'],[5,6,'#388e3c'],
      [5,5,'#388e3c'],[5,4,'#388e3c'],[5,3,'#388e3c'],
      [4,3,'#388e3c'],[3,3,'#388e3c'],[3,4,'#388e3c'],[3,5,'#388e3c'],[3,6,'#388e3c'],
      [7,5,'#388e3c'],[7,6,'#388e3c'],[7,7,'#388e3c'],[6,5,'#388e3c'],
      [2,3,'#2e7d32'],[2,4,'#2e7d32'],[2,5,'#2e7d32'],
      [8,5,'#2e7d32'],[8,6,'#2e7d32'],[8,7,'#2e7d32'],
      [5,2,'#66bb6a'],[5,1,'#66bb6a'],
      [5,0,'#ff4081'],[4,1,'#ff4081'],[6,1,'#ff4081'],
    ],
  },
  mushroom: {
    label: 'Grzyb', cols: 11, rows: 13,
    pixels: [
      [4,12,'#795548'],[5,12,'#795548'],[6,12,'#795548'],
      [4,11,'#795548'],[5,11,'#795548'],[6,11,'#795548'],
      [4,10,'#795548'],[5,10,'#795548'],[6,10,'#795548'],
      [4,9,'#795548'],[5,9,'#795548'],[6,9,'#795548'],
      [2,8,'#e53935'],[3,8,'#e53935'],[4,8,'#e53935'],[5,8,'#e53935'],
      [6,8,'#e53935'],[7,8,'#e53935'],[8,8,'#e53935'],
      [2,7,'#e53935'],[8,7,'#e53935'],
      [3,7,'#e53935'],[7,7,'#e53935'],
      [3,6,'#e53935'],[4,6,'#e53935'],[5,6,'#e53935'],[6,6,'#e53935'],[7,6,'#e53935'],
      [4,5,'#e53935'],[5,5,'#e53935'],[6,5,'#e53935'],
      [5,4,'#e53935'],
      [3,5,'#ffffff'],[5,6,'#ffffff'],[7,5,'#ffffff'],[4,7,'#ffffff'],[6,7,'#ffffff'],
    ],
  },
};

const PRESETS = [25, 40, 60];

// ─── PixelPlant ───────────────────────────────────────────────────────────────

interface PixelPlantProps {
  type: PlantType;
  progress: number;    // 0..1
  pixelSize?: number;
  gap?: number;
  dimmed?: boolean;    // for picker — all grey
}

const PixelPlant: React.FC<PixelPlantProps> = ({
  type, progress, pixelSize = 14, gap = 2, dimmed = false,
}) => {
  const plant = PLANTS[type];
  const total = plant.pixels.length;
  const toShow = dimmed ? 0 : Math.floor(progress * total);

  const grid: Record<string, string> = {};
  plant.pixels.forEach(([c, r, color]) => {
    grid[`${r},${c}`] = color;
  });

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < plant.rows; r++) {
    for (let c = 0; c < plant.cols; c++) {
      const key = `${r},${c}`;
      const color = grid[key];
      const pixelIndex = plant.pixels.findIndex(([pc, pr]) => pr === r && pc === c);
      const isColored = color && pixelIndex < toShow;
      cells.push(
        <div
          key={key}
          className="ft-pixel"
          style={{
            width: pixelSize,
            height: pixelSize,
            background: color
              ? isColored ? color : '#3a3a4a'
              : 'transparent',
          }}
        />
      );
    }
  }

  return (
    <div
      className="ft-pixel-grid"
      style={{
        gridTemplateColumns: `repeat(${plant.cols}, ${pixelSize}px)`,
        gap,
      }}
    >
      {cells}
    </div>
  );
};

// ─── GardenPlant — mini version for the garden ───────────────────────────────

const GardenPlant: React.FC<{ type: PlantType; plantedAt: string }> = ({ type, plantedAt }) => {
  const plant = PLANTS[type];
  const date = new Date(plantedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

  const grid: Record<string, string> = {};
  plant.pixels.forEach(([c, r, color]) => { grid[`${r},${c}`] = color; });

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < plant.rows; r++) {
    for (let c = 0; c < plant.cols; c++) {
      const key = `${r},${c}`;
      cells.push(
        <div
          key={key}
          style={{
            width: 5, height: 5,
            background: grid[key] || 'transparent',
            borderRadius: 1,
          }}
        />
      );
    }
  }

  return (
    <div className="ft-garden-plant">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${plant.cols}, 5px)`, gap: 1 }}>
        {cells}
      </div>
      <span className="ft-garden-plant__date">{date}</span>
    </div>
  );
};

// ─── main component ───────────────────────────────────────────────────────────

const FocusTimer: React.FC = () => {
  const [selectedPlant, setSelectedPlant] = useState<PlantType>('flower');
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [customInput, setCustomInput] = useState('');
  const [garden, setGarden] = useState<IFocusPlant[]>([]);
  const [justFinished, setJustFinished] = useState(false);
  const plantSavedRef = useRef(false);

  const { state, remainingSeconds, totalSeconds, progress, start, pause, resume, reset } =
    useFocusTimer(selectedMinutes, {
      onFinish: () => {
        setJustFinished(true);
      },
    });

  // save plant when finished
  useEffect(() => {
    if (state === 'finished' && !plantSavedRef.current) {
      plantSavedRef.current = true;
      focusPlantService
        .plantSeed(selectedPlant, totalSeconds)
        .then(plant => setGarden(prev => [plant, ...prev]))
        .catch(console.error);
    }
    if (state === 'idle') {
      plantSavedRef.current = false;
      setJustFinished(false);
    }
  }, [state, selectedPlant, totalSeconds]);

  // load garden on mount
  useEffect(() => {
    focusPlantService.getPlants().then(setGarden).catch(console.error);
  }, []);

  const handleCustomMinutes = (val: string) => {
    setCustomInput(val);
    const n = parseInt(val);
    if (!isNaN(n) && n > 0 && n <= 999) {
      setSelectedMinutes(n);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const isIdle     = state === 'idle';
  const isRunning  = state === 'running';
  const isPaused   = state === 'paused';
  const isFinished = state === 'finished';

  return (
    <div className="ft">

      {/* ── plant picker (only when idle) ────────────────────────── */}
      {isIdle && (
        <div className="ft-picker">
          {(Object.keys(PLANTS) as PlantType[]).map(type => (
            <button
              key={type}
              className={`ft-picker__item ${selectedPlant === type ? 'ft-picker__item--active' : ''}`}
              onClick={() => setSelectedPlant(type)}
            >
              <PixelPlant type={type} progress={1} pixelSize={8} gap={1} />
              <span className="ft-picker__label">{PLANTS[type].label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── duration presets + custom input (only when idle) ──── */}
      {isIdle && (
        <div className="ft-presets-row">
          <div className="ft-presets">
            {PRESETS.map(m => (
              <button
                key={m}
                className={`ft-preset ${selectedMinutes === m && !customInput ? 'ft-preset--active' : ''}`}
                onClick={() => { setSelectedMinutes(m); setCustomInput(''); }}
              >
                {m} min
              </button>
            ))}
          </div>
          <div className="ft-custom-input-wrap">
            <input
              type="number"
              className="ft-custom-input"
              placeholder="own"
              min={1}
              max={999}
              value={customInput}
              onChange={e => handleCustomMinutes(e.target.value)}
            />
            <span className="ft-custom-input-label">min</span>
          </div>
        </div>
      )}

      {/* ── status badge (outside plant-wrap so no overlap) ───────── */}
      <div className="ft-badge-slot">
        {isFinished && justFinished && (
          <div className="ft-badge ft-badge--success">🌱 Zasadzono!</div>
        )}
        {isPaused && (
          <div className="ft-badge ft-badge--paused">⏸ Pauza</div>
        )}
        {isRunning && <div className="ft-badge ft-badge--running">▶ Fokus</div>}
      </div>

      {/* ── plant display ────────────────────────────────────────── */}
      <div className="ft-plant-wrap">
        <PixelPlant
          type={selectedPlant}
          progress={isIdle ? 0 : progress}
          pixelSize={14}
          gap={2}
        />
      </div>

      {/* ── timer display ────────────────────────────────────────── */}
      <div className="ft-time">{formatTime(remainingSeconds)}</div>

      {/* ── progress bar ─────────────────────────────────────────── */}
      {!isIdle && (
        <div className="ft-progress-track">
          <div className="ft-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      {/* ── controls ─────────────────────────────────────────────── */}
      <div className="ft-controls">
        {isIdle && (
          <button className="ft-btn ft-btn--primary" onClick={() => start(selectedMinutes)}>
            Rozpocznij
          </button>
        )}
        {isRunning && (
          <button className="ft-btn" onClick={pause}>Pauza</button>
        )}
        {isPaused && (
          <>
            <button className="ft-btn ft-btn--primary" onClick={resume}>Wznów</button>
            <button className="ft-btn ft-btn--ghost" onClick={reset}>Porzuć</button>
          </>
        )}
        {isFinished && (
          <button className="ft-btn ft-btn--primary" onClick={reset}>Nowa sesja</button>
        )}
      </div>

      {/* ── garden ───────────────────────────────────────────────── */}
      {garden.length > 0 && (
        <div className="ft-garden">
          <h3 className="ft-garden__title">Ogród ({garden.length})</h3>
          <div className="ft-garden__grid">
            {garden.map(p => (
              <GardenPlant key={p.id} type={p.plant_type as PlantType} plantedAt={p.planted_at} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusTimer;