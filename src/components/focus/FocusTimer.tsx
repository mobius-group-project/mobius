import React, { useState, useEffect, useRef } from 'react';
import { useFocusTimer } from '../../hooks/useFocusTimer';
import { focusPlantService, type IFocusPlant } from '../../services/focusPlantService';
import './styles/FocusTimer.css';

// ─── plant data ───────────────────────────────────────────────────────────────

export type PlantType = 'flower' | 'cactus' | 'mushroom' | 'krzak' | 'lotos' | 'bonsai' | 'rumianek' | 'sakura' | 'sunflower';

interface PlantDef {
  label: string;
  cols: number;
  rows: number;
  pixels: [number, number, string][];
}

const PLANTS: Record<PlantType, PlantDef> = {
  flower: {
    label: 'Tulipan', cols: 11, rows: 13,
    pixels: [
      // stem
      [5,12,'#388e3c'],[5,11,'#388e3c'],[5,10,'#388e3c'],[5,9,'#388e3c'],
      // leaves
      [3,10,'#4caf50'],[4,10,'#4caf50'],
      [6,9,'#4caf50'],[7,9,'#4caf50'],
      // receptacle
      [4,8,'#2e7d32'],[5,8,'#2e7d32'],[6,8,'#2e7d32'],
      // outer petals — tulip cup
      [3,7,'#e53935'],[4,7,'#e53935'],[5,7,'#e53935'],[6,7,'#e53935'],[7,7,'#e53935'],
      [2,6,'#e53935'],[3,6,'#e53935'],[7,6,'#e53935'],[8,6,'#e53935'],
      [2,5,'#ef5350'],[8,5,'#ef5350'],
      [3,4,'#e53935'],[7,4,'#e53935'],
      // inner lighter fill
      [4,6,'#ef9a9a'],[5,6,'#ef9a9a'],[6,6,'#ef9a9a'],
      [4,5,'#ffcdd2'],[5,5,'#ffcdd2'],[6,5,'#ffcdd2'],
      [4,4,'#ef9a9a'],[5,4,'#ef9a9a'],[6,4,'#ef9a9a'],
      // three petal tips at top
      [3,3,'#e53935'],[5,3,'#e53935'],[7,3,'#e53935'],
      [4,3,'#ef9a9a'],[6,3,'#ef9a9a'],
      [3,2,'#ef5350'],[5,2,'#c62828'],[7,2,'#ef5350'],
      [4,2,'#e53935'],[6,2,'#e53935'],
      [5,1,'#c62828'],
    ],
  },
  cactus: {
    label: 'Kaktus', cols: 11, rows: 11,
    pixels: [
      // ground
      [3,10,'#5d4037'],[4,10,'#5d4037'],[5,10,'#5d4037'],[6,10,'#5d4037'],[7,10,'#5d4037'],
      // trunk base
      [4,9,'#2e7d32'],[5,9,'#388e3c'],[6,9,'#2e7d32'],
      [4,8,'#2e7d32'],[5,8,'#388e3c'],[6,8,'#2e7d32'],
      // left arm extends from trunk
      [1,7,'#2e7d32'],[2,7,'#388e3c'],[3,7,'#388e3c'],[4,7,'#388e3c'],[5,7,'#388e3c'],[6,7,'#2e7d32'],
      [1,6,'#2e7d32'],[2,6,'#66bb6a'],[3,6,'#2e7d32'],[4,6,'#2e7d32'],[5,6,'#388e3c'],[6,6,'#2e7d32'],
      // trunk
      [4,5,'#2e7d32'],[5,5,'#388e3c'],[6,5,'#2e7d32'],
      // right arm extends from trunk
      [4,4,'#2e7d32'],[5,4,'#388e3c'],[6,4,'#388e3c'],[7,4,'#388e3c'],[8,4,'#2e7d32'],
      [4,3,'#2e7d32'],[5,3,'#388e3c'],[6,3,'#2e7d32'],[7,3,'#66bb6a'],[8,3,'#2e7d32'],
      // upper trunk
      [4,2,'#2e7d32'],[5,2,'#388e3c'],[6,2,'#2e7d32'],
      [4,1,'#2e7d32'],[5,1,'#388e3c'],[6,1,'#2e7d32'],
      // flower (appears last)
      [4,0,'#ff80ab'],[5,0,'#ff4081'],[6,0,'#ff80ab'],
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
  krzak: {
    label: 'Krzak', cols: 11, rows: 10,
    pixels: [
      [3,9,'#5d4037'],[4,9,'#5d4037'],[5,9,'#5d4037'],[6,9,'#5d4037'],[7,9,'#5d4037'],
      [3,7,'#2e7d32'],[4,7,'#2e7d32'],[5,7,'#2e7d32'],[6,7,'#2e7d32'],[7,7,'#2e7d32'],
      [2,6,'#388e3c'],[3,6,'#388e3c'],[4,6,'#388e3c'],[5,6,'#388e3c'],[6,6,'#388e3c'],[7,6,'#388e3c'],[8,6,'#388e3c'],
      [1,5,'#4caf50'],[2,5,'#4caf50'],[3,5,'#4caf50'],[4,5,'#4caf50'],[5,5,'#4caf50'],[6,5,'#4caf50'],[7,5,'#4caf50'],[8,5,'#4caf50'],[9,5,'#4caf50'],
      [1,4,'#66bb6a'],[2,4,'#66bb6a'],[3,4,'#66bb6a'],[4,4,'#66bb6a'],[5,4,'#66bb6a'],[6,4,'#66bb6a'],[7,4,'#66bb6a'],[8,4,'#66bb6a'],[9,4,'#66bb6a'],
      [2,3,'#81c784'],[3,3,'#81c784'],[4,3,'#81c784'],[5,3,'#81c784'],[6,3,'#81c784'],[7,3,'#81c784'],[8,3,'#81c784'],
      [3,2,'#a5d6a7'],[4,2,'#a5d6a7'],[5,2,'#a5d6a7'],[6,2,'#a5d6a7'],[7,2,'#a5d6a7'],
      [4,1,'#c8e6c9'],[5,1,'#c8e6c9'],[6,1,'#c8e6c9'],
      [2,4,'#f48fb1'],[7,3,'#f48fb1'],[9,4,'#ff80ab'],[3,2,'#ff4081'],[7,2,'#f06292'],[5,1,'#ff4081'],
    ],
  },
  lotos: {
    label: 'Lotos', cols: 11, rows: 10,
    pixels: [
      // lily pad
      [3,9,'#1b5e20'],[4,9,'#1b5e20'],[5,9,'#1b5e20'],[6,9,'#1b5e20'],[7,9,'#1b5e20'],
      [1,8,'#2e7d32'],[2,8,'#2e7d32'],[3,8,'#2e7d32'],[4,8,'#2e7d32'],[5,8,'#2e7d32'],[6,8,'#2e7d32'],[7,8,'#2e7d32'],[8,8,'#2e7d32'],[9,8,'#2e7d32'],
      [2,7,'#388e3c'],[3,7,'#388e3c'],[4,7,'#388e3c'],[5,7,'#388e3c'],[6,7,'#388e3c'],[7,7,'#388e3c'],[8,7,'#388e3c'],
      // sepal
      [4,6,'#2e7d32'],[5,6,'#2e7d32'],[6,6,'#2e7d32'],
      // petals — connected, no gaps, crown shape
      [3,5,'#fce4ec'],[4,5,'#fce4ec'],[6,5,'#fce4ec'],[7,5,'#fce4ec'],
      [2,4,'#f8bbd0'],[3,4,'#f8bbd0'],[4,4,'#f8bbd0'],[5,4,'#f8bbd0'],[6,4,'#f8bbd0'],[7,4,'#f8bbd0'],[8,4,'#f8bbd0'],
      [2,3,'#f48fb1'],[3,3,'#f48fb1'],[4,3,'#f48fb1'],[5,3,'#f48fb1'],[6,3,'#f48fb1'],[7,3,'#f48fb1'],[8,3,'#f48fb1'],
      [3,2,'#ec407a'],[4,2,'#ec407a'],[5,2,'#ec407a'],[6,2,'#ec407a'],[7,2,'#ec407a'],
      [3,1,'#f48fb1'],[4,1,'#ec407a'],[5,1,'#e91e63'],[6,1,'#ec407a'],[7,1,'#f48fb1'],
      [4,0,'#fce4ec'],[5,0,'#f8bbd0'],[6,0,'#fce4ec'],
      // stamen center
      [5,5,'#fff176'],
    ],
  },
  bonsai: {
    label: 'Bonsai', cols: 13, rows: 14,
    pixels: [
      [4,13,'#5d4037'],[5,13,'#5d4037'],[6,13,'#5d4037'],[7,13,'#5d4037'],[8,13,'#5d4037'],
      [5,12,'#6d4c41'],[6,12,'#6d4c41'],[7,12,'#6d4c41'],
      [5,11,'#6d4c41'],[6,11,'#6d4c41'],[7,11,'#6d4c41'],
      [5,10,'#795548'],[6,10,'#795548'],
      [5,9,'#795548'],[6,9,'#795548'],
      [4,8,'#795548'],[5,8,'#795548'],[6,8,'#795548'],[7,8,'#795548'],
      [3,7,'#8d6e63'],[4,7,'#8d6e63'],
      [8,7,'#8d6e63'],[9,7,'#8d6e63'],
      [2,6,'#8d6e63'],[3,6,'#8d6e63'],
      [9,6,'#8d6e63'],[10,6,'#8d6e63'],
      [1,5,'#1b5e20'],[2,5,'#1b5e20'],[3,5,'#1b5e20'],[4,5,'#1b5e20'],[5,5,'#1b5e20'],
      [7,5,'#1b5e20'],[8,5,'#1b5e20'],[9,5,'#1b5e20'],[10,5,'#1b5e20'],[11,5,'#1b5e20'],
      [0,4,'#2e7d32'],[1,4,'#2e7d32'],[2,4,'#2e7d32'],[3,4,'#2e7d32'],[4,4,'#2e7d32'],
      [5,4,'#388e3c'],[6,4,'#388e3c'],[7,4,'#388e3c'],
      [8,4,'#2e7d32'],[9,4,'#2e7d32'],[10,4,'#2e7d32'],[11,4,'#2e7d32'],[12,4,'#2e7d32'],
      [1,3,'#388e3c'],[2,3,'#388e3c'],[3,3,'#388e3c'],[4,3,'#388e3c'],
      [5,3,'#4caf50'],[6,3,'#4caf50'],[7,3,'#4caf50'],
      [9,3,'#388e3c'],[10,3,'#388e3c'],[11,3,'#388e3c'],
      [1,2,'#4caf50'],[2,2,'#4caf50'],[3,2,'#4caf50'],
      [5,2,'#66bb6a'],[6,2,'#66bb6a'],[7,2,'#66bb6a'],
      [10,2,'#4caf50'],[11,2,'#4caf50'],
      [5,1,'#81c784'],[6,1,'#81c784'],[7,1,'#81c784'],
      [6,0,'#a5d6a7'],
    ],
  },
  rumianek: {
    label: 'Rumianek', cols: 11, rows: 13,
    pixels: [
      [5,12,'#388e3c'],[5,11,'#388e3c'],[5,10,'#388e3c'],[5,9,'#388e3c'],[5,8,'#388e3c'],
      [3,10,'#4caf50'],[4,10,'#4caf50'],
      [6,9,'#4caf50'],[7,9,'#4caf50'],
      [4,7,'#66bb6a'],[5,7,'#66bb6a'],[6,7,'#66bb6a'],
      [5,6,'#ffffff'],[5,2,'#ffffff'],
      [2,4,'#ffffff'],[8,4,'#ffffff'],
      [3,3,'#f5f5f5'],[7,3,'#f5f5f5'],
      [3,5,'#f5f5f5'],[7,5,'#f5f5f5'],
      [2,3,'#eeeeee'],[8,3,'#eeeeee'],
      [2,5,'#eeeeee'],[8,5,'#eeeeee'],
      [4,2,'#ffffff'],[6,2,'#ffffff'],
      [4,6,'#ffffff'],[6,6,'#ffffff'],
      [3,4,'#f5f5f5'],[7,4,'#f5f5f5'],
      [4,4,'#fdd835'],[5,4,'#fdd835'],[6,4,'#fdd835'],
      [4,3,'#fdd835'],[5,3,'#fdd835'],[6,3,'#fdd835'],
    ],
  },
  sunflower: {
    label: 'Słonecznik', cols: 11, rows: 13,
    pixels: [
      // stem + leaves
      [5,12,'#388e3c'],[5,11,'#388e3c'],[5,10,'#388e3c'],[5,9,'#388e3c'],
      [3,10,'#4caf50'],[4,10,'#4caf50'],
      [6,9,'#4caf50'],[7,9,'#4caf50'],
      // yellow petals
      [5,0,'#ffd600'],
      [4,1,'#fdd835'],[5,1,'#fdd835'],[6,1,'#fdd835'],
      [3,2,'#fdd835'],[7,2,'#fdd835'],
      [1,3,'#fdd835'],[2,3,'#fdd835'],
      [1,4,'#fdd835'],[2,4,'#fdd835'],
      [1,5,'#fdd835'],[2,5,'#fdd835'],
      [1,6,'#fdd835'],[2,6,'#fdd835'],
      [8,3,'#fdd835'],[9,3,'#fdd835'],
      [8,4,'#fdd835'],[9,4,'#fdd835'],
      [8,5,'#fdd835'],[9,5,'#fdd835'],
      [8,6,'#fdd835'],[9,6,'#fdd835'],
      [3,7,'#fdd835'],[7,7,'#fdd835'],
      [4,8,'#fdd835'],[5,8,'#fdd835'],[6,8,'#fdd835'],
      // dark center (appears last)
      [4,2,'#5d4037'],[5,2,'#5d4037'],[6,2,'#5d4037'],
      [3,3,'#5d4037'],[4,3,'#4e342e'],[5,3,'#4e342e'],[6,3,'#4e342e'],[7,3,'#5d4037'],
      [3,4,'#5d4037'],[4,4,'#3e2723'],[5,4,'#3e2723'],[6,4,'#3e2723'],[7,4,'#5d4037'],
      [3,5,'#5d4037'],[4,5,'#3e2723'],[5,5,'#4a2f00'],[6,5,'#3e2723'],[7,5,'#5d4037'],
      [3,6,'#5d4037'],[4,6,'#4e342e'],[5,6,'#4e342e'],[6,6,'#4e342e'],[7,6,'#5d4037'],
      [4,7,'#5d4037'],[5,7,'#5d4037'],[6,7,'#5d4037'],
    ],
  },
  sakura: {
    label: 'Sakura', cols: 13, rows: 13,
    pixels: [
      [5,12,'#5d4037'],[6,12,'#5d4037'],[7,12,'#5d4037'],
      [5,11,'#6d4c41'],[6,11,'#6d4c41'],[7,11,'#6d4c41'],
      [6,10,'#795548'],[7,10,'#795548'],
      [6,9,'#795548'],
      [5,9,'#795548'],[4,8,'#8d6e63'],[3,8,'#8d6e63'],[2,8,'#8d6e63'],
      [7,9,'#795548'],[8,8,'#8d6e63'],[9,8,'#8d6e63'],[10,8,'#8d6e63'],
      [6,8,'#795548'],[6,7,'#795548'],[6,6,'#8d6e63'],
      [1,7,'#fce4ec'],[2,7,'#fce4ec'],[3,7,'#fce4ec'],
      [10,7,'#fce4ec'],[11,7,'#fce4ec'],
      [1,6,'#f8bbd0'],[2,6,'#f8bbd0'],[3,6,'#f8bbd0'],[4,6,'#f8bbd0'],
      [9,6,'#f8bbd0'],[10,6,'#f8bbd0'],[11,6,'#f8bbd0'],
      [5,5,'#f8bbd0'],[6,5,'#f8bbd0'],[7,5,'#f8bbd0'],
      [1,5,'#f48fb1'],[2,5,'#f48fb1'],[3,5,'#f48fb1'],
      [8,5,'#f48fb1'],[9,5,'#f48fb1'],[10,5,'#f48fb1'],[11,5,'#f48fb1'],
      [4,4,'#f48fb1'],[5,4,'#f48fb1'],[6,4,'#f48fb1'],[7,4,'#f48fb1'],[8,4,'#f48fb1'],
      [1,4,'#ec407a'],[2,4,'#ec407a'],[3,4,'#ec407a'],
      [9,4,'#ec407a'],[10,4,'#ec407a'],[11,4,'#ec407a'],
      [5,3,'#ec407a'],[6,3,'#ec407a'],[7,3,'#ec407a'],
      [2,3,'#f06292'],[3,3,'#f06292'],
      [10,3,'#f06292'],[11,3,'#f06292'],
      [5,2,'#f48fb1'],[6,2,'#f48fb1'],[7,2,'#f48fb1'],
      [5,1,'#fce4ec'],[6,1,'#fce4ec'],[7,1,'#fce4ec'],
      [6,0,'#ffffff'],
    ],
  },
};

const PRESETS = [25, 40, 60];

// ─── PixelPlant ───────────────────────────────────────────────────────────────

interface PixelPlantProps {
  type: PlantType;
  progress: number;
  pixelSize?: number;
  gap?: number;
  maxWidth?: number; // normalizes pixelSize so all plants fit the same width
}

export const PixelPlant: React.FC<PixelPlantProps> = ({
  type, progress, pixelSize = 14, gap = 2, maxWidth,
}) => {
  const plant = PLANTS[type];
  const effectiveSize = maxWidth
    ? Math.max(3, Math.floor((maxWidth - gap * (plant.cols - 1)) / plant.cols))
    : pixelSize;
  const total = plant.pixels.length;
  const toShow = Math.floor(progress * total);

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
            width: effectiveSize,
            height: effectiveSize,
            background: color ? (isColored ? color : '#3a3a4a') : 'transparent',
          }}
        />
      );
    }
  }

  return (
    <div
      className="ft-pixel-grid"
      style={{ gridTemplateColumns: `repeat(${plant.cols}, ${effectiveSize}px)`, gap }}
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

  const GARDEN_W = 80;
  const gardenPx = Math.max(3, Math.floor((GARDEN_W - 1 * (plant.cols - 1)) / plant.cols));

  const gardenCells: React.ReactNode[] = [];
  for (let r = 0; r < plant.rows; r++) {
    for (let c = 0; c < plant.cols; c++) {
      const key = `${r},${c}`;
      gardenCells.push(
        <div key={key} style={{
          width: gardenPx, height: gardenPx,
          borderRadius: 1,
          background: grid[key] || 'transparent',
        }} />
      );
    }
  }

  return (
    <div className="ft-garden-plant">
      <div className="ft-garden-plant__thumb">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${plant.cols}, ${gardenPx}px)`, gap: 1 }}>
          {gardenCells}
        </div>
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

  // persist plant type for dashboard
  useEffect(() => {
    localStorage.setItem('mobius.focusPlantType.v1', selectedPlant);
  }, [selectedPlant]);

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

  const getGrowthMessage = (p: number): string => {
    if (p < 0.15) return '🌱 Sadzimy nasionko...';
    if (p < 0.35) return '💧 Podlewamy roślinę...';
    if (p < 0.55) return '☀️ Roślina pije słońce...';
    if (p < 0.75) return '🌿 Widzimy pierwsze listki!';
    if (p < 0.95) return '🌸 Już prawie gotowe...';
    return '✨ Ostatnie chwile!';
  };

  const isIdle     = state === 'idle';
  const isRunning  = state === 'running';
  const isPaused   = state === 'paused';
  const isFinished = state === 'finished';

  return (
    <div className="ft">

      {/* ── main area: picker left + timer right ─────────────────── */}
      <div className="ft-main">

          {/* LEFT: plant picker grid */}
        <div className="ft-sidebar">
          <p className="ft-sidebar__label">Roślina</p>
          <div className="ft-picker">
            {(Object.keys(PLANTS) as PlantType[]).map(type => (
              <button
                key={type}
                className={`ft-picker__item ${selectedPlant === type ? 'ft-picker__item--active' : ''}`}
                onClick={() => { if (isIdle) setSelectedPlant(type); }}
                disabled={!isIdle}
                title={PLANTS[type].label}
              >
                <div className="ft-picker__thumb">
                  <PixelPlant type={type} progress={1} maxWidth={88} gap={1} />
                </div>
                <span className="ft-picker__label">{PLANTS[type].label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: presets + badge + plant + timer + controls */}
        <div className="ft-center">
          {/* duration presets */}
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

          {/* status badge / growth message */}
          <div className="ft-badge-slot">
            {isFinished && justFinished && <div className="ft-badge ft-badge--success">🌱 Zasadzono!</div>}
            {isPaused   && <div className="ft-badge ft-badge--paused">⏸ Pauza</div>}
            {isRunning  && <div className="ft-badge ft-badge--running">{getGrowthMessage(progress)}</div>}
          </div>

          <div className="ft-plant-wrap">
            <PixelPlant
              type={selectedPlant}
              progress={isIdle ? 0 : progress}
              pixelSize={14}
              gap={2}
            />
          </div>

          <div className="ft-time">{formatTime(remainingSeconds)}</div>

          {!isIdle && (
            <div className="ft-progress-track">
              <div className="ft-progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
          )}

          <div className="ft-controls">
            {isIdle     && <button className="ft-btn ft-btn--primary" onClick={() => start(selectedMinutes)}>Rozpocznij</button>}
            {isRunning  && <button className="ft-btn" onClick={pause}>Pauza</button>}
            {isPaused   && <>
              <button className="ft-btn ft-btn--primary" onClick={resume}>Wznów</button>
              <button className="ft-btn ft-btn--ghost" onClick={reset}>Porzuć</button>
            </>}
            {isFinished && <button className="ft-btn ft-btn--primary" onClick={reset}>Nowa sesja</button>}
          </div>
        </div>
      </div>

      {/* ── garden (full width below) ─────────────────────────────── */}
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