/**
 * Main entry point for the focus module.
 *
 * Contains:
 * - FocusTimer — the primary component rendered at /focus and embedded on the dashboard (compact mode)
 * - PixelPlant — animated pixel-art plant that grows as the timer progresses
 * - GardenPlant — static mini version of a plant used inside the draggable garden
 * - PLANTS — pixel-art definitions for all 9 plant types
 *
 * All garden and decoration state (positions, z-indexes, deleted items) is persisted
 * to localStorage so the user's layout is preserved across sessions.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useFocusTimer } from '../../hooks/useFocusTimer';
import { focusPlantService, type IFocusPlant } from '../../services/focusPlantService';
import {
  DraggableDecoration, HouseSprite, BedSprite, FenceSectionSprite,
  DECO_DEFAULT, type DecoPositions, type DecorationId,
} from './GardenDecorations';
import './styles/FocusTimer.css';

// ─── localStorage keys ────────────────────────────────────────────────────────

/** Stores the pixel positions of draggable decorations as Record<DecorationId, {x,y}>. */
const DECO_POS_KEY     = 'mobius.gardenDecorations.v2';
/** Stores the set of decoration IDs the user has removed as DecorationId[]. */
const DECO_DELETED_KEY = 'mobius.gardenDecorationsDeleted.v2';
/** Stores the z-index of each decoration as Record<DecorationId, number>. */
const DECO_ZINDEX_KEY  = 'mobius.gardenDecorationsZ.v2';
/** Stores the pixel positions of garden plants as Record<plantId, {x,y}>. */
const GARDEN_POS_KEY = 'mobius.gardenPositions.v2';

// ─── decoration defaults ──────────────────────────────────────────────────────

/**
 * Default z-index for each decoration.
 * Fence sections are set high (15) so they render in front of plants by default,
 * giving the appearance that plants grow inside the fenced area.
 */
const DECO_DEFAULT_Z: Record<DecorationId, number> = {
  house: 2, bed1: 1, bed2: 1, bed3: 1, bed4: 1, bed5: 1,
  fence1: 15, fence2: 15, fence3: 15, fence4: 15, fence5: 15,
};

// ─── localStorage loaders ─────────────────────────────────────────────────────

/**
 * Loads saved decoration positions from localStorage.
 * Falls back to DECO_DEFAULT for any decoration not yet moved by the user.
 */
const loadDecoPositions = (): DecoPositions => {
  try { return { ...DECO_DEFAULT, ...JSON.parse(localStorage.getItem(DECO_POS_KEY) || '{}') }; }
  catch { return { ...DECO_DEFAULT }; }
};

/** Loads the set of decoration IDs the user has deleted. Returns an empty Set if nothing was deleted. */
const loadDeletedDecos = (): Set<DecorationId> => {
  try { return new Set(JSON.parse(localStorage.getItem(DECO_DELETED_KEY) || '[]')); }
  catch { return new Set(); }
};

/**
 * Loads saved z-indexes for decorations.
 * Falls back to DECO_DEFAULT_Z for any decoration whose z-index hasn't been adjusted.
 */
const loadDecoZIndexes = (): Record<DecorationId, number> => {
  try { return { ...DECO_DEFAULT_Z, ...JSON.parse(localStorage.getItem(DECO_ZINDEX_KEY) || '{}') }; }
  catch { return { ...DECO_DEFAULT_Z }; }
};

/** Loads saved pixel positions for grown plants. Returns an empty object if no plants have been moved. */
const loadGardenPositions = (): Record<number, { x: number; y: number }> => {
  try { return JSON.parse(localStorage.getItem(GARDEN_POS_KEY) || '{}'); } catch { return {}; }
};

/**
 * Returns the default grid position for a plant at the given index.
 * Plants are laid out in a 4-column grid with 120px horizontal and 130px vertical spacing.
 */
const defaultPos = (index: number) => ({
  x: (index % 4) * 120,
  y: Math.floor(index / 4) * 130,
});

// ─── DraggableGardenPlant ─────────────────────────────────────────────────────

/** Props for the draggable plant wrapper in the garden canvas. */
interface DraggableGardenPlantProps {
  /** The plant data from the database. */
  plant: IFocusPlant;
  /** Index in the garden array — used to calculate the default position if no saved position exists. */
  index: number;
  /** Initial pixel position on the garden canvas. */
  initialPos: { x: number; y: number };
  /** Called when the user finishes dragging. Receives the plant's DB id and new position. */
  onDragEnd: (id: number, x: number, y: number) => void;
  /** Called on mousedown so the parent can bring this plant to the front (highest z-index). */
  onPickUp: () => void;
  /** Called on right-click to open the plant info popup. */
  onRightClick: (e: React.MouseEvent) => void;
}

/**
 * Renders a draggable plant sprite in the garden canvas.
 * Uses the same global mousemove/mouseup pattern as DraggableDecoration so
 * the drag continues even if the pointer leaves the element.
 */
const DraggableGardenPlant: React.FC<DraggableGardenPlantProps> = ({
  plant, initialPos, onDragEnd, onPickUp, onRightClick,
}) => {
  const [pos, setPos] = useState(initialPos);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  /** Initiates a drag and notifies the parent to bring this plant to the front. */
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    onPickUp();
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = pos;

    const onMove = (ev: MouseEvent) => {
      setPos({
        x: startPos.current.x + ev.clientX - startMouse.current.x,
        y: startPos.current.y + ev.clientY - startMouse.current.y,
      });
    };

    const onUp = (ev: MouseEvent) => {
      const finalX = startPos.current.x + ev.clientX - startMouse.current.x;
      const finalY = startPos.current.y + ev.clientY - startMouse.current.y;
      setPos({ x: finalX, y: finalY });
      onDragEnd(plant.id, finalX, finalY);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onContextMenu={onRightClick}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <GardenPlant type={plant.plant_type as PlantType} plantedAt={plant.planted_at} />
    </div>
  );
};

// ─── plant data ───────────────────────────────────────────────────────────────

/** All available plant types the user can grow during a focus session. */
export type PlantType = 'flower' | 'cactus' | 'mushroom' | 'krzak' | 'lotos' | 'bonsai' | 'rumianek' | 'sakura' | 'sunflower';

/** Definition of a single plant's pixel-art sprite. */
interface PlantDef {
  /** Display name shown in the plant picker and info popup. */
  label: string;
  /** Number of columns in the pixel grid. */
  cols: number;
  /** Number of rows in the pixel grid. */
  rows: number;
  /**
   * Sparse pixel list as [col, row, cssColor] tuples.
   * The order matters for PixelPlant: pixels earlier in the array appear first as the plant grows.
   */
  pixels: [number, number, string][];
}

/**
 * Pixel-art definitions for all 9 plant types.
 * Each entry describes the full grown appearance; PixelPlant reveals pixels
 * one-by-one as the timer progresses, creating a growth animation.
 */
const PLANTS: Record<PlantType, PlantDef> = {
  flower: {
    label: 'Tulip', cols: 11, rows: 13,
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
    label: 'Cactus', cols: 11, rows: 11,
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
    label: 'Mushroom', cols: 11, rows: 13,
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
    label: 'Bush', cols: 11, rows: 10,
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
    label: 'Lotus', cols: 11, rows: 10,
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
    label: 'Chamomile', cols: 11, rows: 13,
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
    label: 'Sunflower', cols: 11, rows: 13,
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

/** Quick-select duration buttons shown in the idle state. */
const PRESETS = [25, 40, 60];

// ─── PixelPlant ───────────────────────────────────────────────────────────────

/** Props for the animated pixel-art plant component. */
interface PixelPlantProps {
  /** Which plant to render. */
  type: PlantType;
  /**
   * How much of the plant to reveal, from 0 (nothing visible) to 1 (fully grown).
   * Pixels are revealed in the order they appear in the PLANTS pixel array.
   */
  progress: number;
  /** Size of each pixel in CSS px. Ignored when maxWidth is set. Defaults to 14. */
  pixelSize?: number;
  /** Gap between pixels in CSS px. Defaults to 2. */
  gap?: number;
  /**
   * If provided, pixelSize is calculated automatically so the plant fits within
   * this width in CSS px. Useful for making plants with different grid sizes appear
   * at the same visual width (e.g. in the compact gallery).
   */
  maxWidth?: number;
}

/**
 * Renders a pixel-art plant that grows pixel-by-pixel as `progress` increases from 0 to 1.
 * Pixels not yet revealed are shown in a dark placeholder colour (#3a3a4a) rather than
 * hidden, so the full plant silhouette is always visible — it just gradually brightens.
 *
 * @param props - See PixelPlantProps.
 */
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

// ─── GardenPlant ─────────────────────────────────────────────────────────────

/**
 * Static mini version of a plant used in the draggable garden canvas.
 * Unlike PixelPlant it always renders the fully grown plant (progress = 1)
 * and uses a fixed target width of 80px for consistent sizing in the garden.
 */
const GardenPlant: React.FC<{ type: PlantType; plantedAt: string }> = ({ type }) => {
  const plant = PLANTS[type];

  const grid: Record<string, string> = {};
  plant.pixels.forEach(([c, r, color]) => { grid[`${r},${c}`] = color; });

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
    </div>
  );
};

// ─── main component ───────────────────────────────────────────────────────────

/** Props for the FocusTimer component. */
interface FocusTimerProps {
  /**
   * When true, renders the compact layout for embedding on the dashboard.
   * The timer state is shared with the full /focus page via localStorage —
   * starting a session on the dashboard will show it as running when the user navigates to /focus.
   */
  compact?: boolean;
}

/**
 * Full focus module: plant picker, countdown timer, progress bar, controls, and draggable garden.
 *
 * In normal mode it shows a two-column layout (plant picker on the left, timer on the right)
 * with the full draggable garden below. In compact mode it collapses to a single-column
 * layout suitable for the dashboard card, with a horizontal plant gallery at the bottom.
 *
 * A plant is saved to the database when the timer finishes. The `plantSavedRef` guard
 * prevents a double-save in the rare case onFinish is called while the component is
 * in the middle of re-rendering.
 */
const FocusTimer: React.FC<FocusTimerProps> = ({ compact = false }) => {
  // Initialise from localStorage so the selected plant is remembered across sessions
  // and kept in sync between the dashboard and the full focus page.
  const [selectedPlant, setSelectedPlant] = useState<PlantType>(() => {
    const saved = localStorage.getItem('mobius.focusPlantType.v1') as PlantType | null;
    return saved && PLANTS[saved] ? saved : 'flower';
  });
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [customInput, setCustomInput] = useState('');
  const [garden, setGarden] = useState<IFocusPlant[]>([]);
  const [gardenPositions, setGardenPositions] = useState<Record<number, { x: number; y: number }>>(loadGardenPositions);
  const [decoPositions, setDecoPositions]   = useState<DecoPositions>(loadDecoPositions);
  const [deletedDecos,  setDeletedDecos]    = useState<Set<DecorationId>>(loadDeletedDecos);
  const [decoZIndexes,  setDecoZIndexes]    = useState<Record<DecorationId, number>>(loadDecoZIndexes);

  /** Persists the new position of a moved decoration to localStorage. */
  const onDecoMove = (id: DecorationId, x: number, y: number) => {
    setDecoPositions(prev => {
      const updated = { ...prev, [id]: { x, y } };
      localStorage.setItem(DECO_POS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  /** Adjusts the z-index of a decoration by delta (+1 forward, -1 backward) and persists it. */
  const onDecoZ = (id: DecorationId, delta: number) => {
    setDecoZIndexes(prev => {
      const next = { ...prev, [id]: prev[id] + delta };
      localStorage.setItem(DECO_ZINDEX_KEY, JSON.stringify(next));
      return next;
    });
  };

  /** Marks a decoration as deleted and persists the updated set to localStorage. */
  const onDecoDelete = (id: DecorationId) => {
    setDeletedDecos(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(DECO_DELETED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  /** ID of the plant currently being dragged, used to temporarily raise its z-index above all others. */
  const [topPlantId, setTopPlantId] = useState<number | null>(null);
  /** The plant whose info popup is currently open (right-click to open, click canvas to close). */
  const [focusedGardenPlant, setFocusedGardenPlant] = useState<IFocusPlant | null>(null);
  // false on init so the "planted" badge doesn't show when restoring an already-finished session from a previous run.
  const [justFinished, setJustFinished] = useState(false);
  /** Guards against saving the same plant twice if onFinish fires unexpectedly more than once. */
  const plantSavedRef = useRef(false);

  const { state, remainingSeconds, totalSeconds, progress, sessionId, start, pause, resume, reset } =
    useFocusTimer(selectedMinutes, {
      onFinish: () => {
        // onFinish fires exactly once per session (deduped in useFocusTimer).
        if (!plantSavedRef.current) {
          plantSavedRef.current = true;
          focusPlantService
            .plantSeed(selectedPlant, totalSeconds)
            .then(plant => setGarden(prev => [plant, ...prev]))
            .catch(console.error);
        }
        setJustFinished(true);
      },
    });

  // Persist the selected plant type so the dashboard compact view reads the same value.
  useEffect(() => {
    localStorage.setItem('mobius.focusPlantType.v1', selectedPlant);
  }, [selectedPlant]);

  // Reset per-session flags when the timer returns to idle (after reset or a new session starts).
  useEffect(() => {
    if (state === 'idle') {
      plantSavedRef.current = false;
      setJustFinished(false);
    }
  }, [state]);

  /** Starts the timer with the currently selected duration. */
  const handleStart = (minutes: number) => {
    start(minutes);
  };

  // Load the full plant garden from the database on mount.
  useEffect(() => {
    focusPlantService.getPlants().then(setGarden).catch(console.error);
  }, []);

  /**
   * Updates the custom duration input and reflects valid values (1–999 min) in selectedMinutes.
   * Invalid input is stored in customInput but does not change the active duration.
   */
  const handleCustomMinutes = (val: string) => {
    setCustomInput(val);
    const n = parseInt(val);
    if (!isNaN(n) && n > 0 && n <= 999) {
      setSelectedMinutes(n);
    }
  };

  /** Formats a duration in seconds to MM:SS display format. */
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  /**
   * Returns a growth-themed status message based on how far through the session the user is.
   * @param p - Progress fraction from 0 to 1.
   */
  const getGrowthMessage = (p: number): string => {
    if (p < 0.15) return '🌱 Planting a seed...';
    if (p < 0.35) return '💧 Watering the plant...';
    if (p < 0.55) return '☀️ Soaking up the sun...';
    if (p < 0.75) return '🌿 First leaves appearing!';
    if (p < 0.95) return '🌸 Almost there...';
    return '✨ Final moments!';
  };

  const isIdle     = state === 'idle';
  const isRunning  = state === 'running';
  const isPaused   = state === 'paused';
  const isFinished = state === 'finished';

  if (compact) {
    return (
      <div className="ft ft--compact">
        <div className="ft-compact-main">
          <div className="ft-badge-slot">
            {isFinished && justFinished && <div className="ft-badge ft-badge--success">🌱 Zasadzono!</div>}
            {isPaused && <div className="ft-badge ft-badge--paused">⏸ Paused</div>}
            {isRunning && <div className="ft-badge ft-badge--running">{getGrowthMessage(progress)}</div>}
          </div>

          <div className="ft-plant-wrap ft-plant-wrap--compact">
            <PixelPlant type={selectedPlant} progress={isIdle ? 0 : progress} pixelSize={10} gap={2} />
          </div>

          <div className="ft-time ft-time--compact">{formatTime(remainingSeconds)}</div>

          <div className="ft-progress-track" style={{ visibility: isIdle ? 'hidden' : 'visible' }}>
            <div className="ft-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>

          <div className="ft-controls">
            {isIdle && (
              <>
                <button className="ft-btn ft-btn--primary ft-btn--icon" onClick={() => handleStart(selectedMinutes)}>▶</button>
                <div className="ft-custom-input-wrap">
                  <input
                    type="number"
                    className="ft-custom-input"
                    placeholder={String(selectedMinutes)}
                    min={1}
                    max={999}
                    value={customInput}
                    onChange={e => handleCustomMinutes(e.target.value)}
                  />
                  <span className="ft-custom-input-label">min</span>
                </div>
              </>
            )}
            {isRunning && <button className="ft-btn" onClick={pause}>Pause</button>}
            {isPaused && (
              <>
                <button className="ft-btn ft-btn--primary" onClick={resume}>Resume</button>
                <button className="ft-btn ft-btn--ghost" onClick={reset}>Abandon</button>
              </>
            )}
            {isFinished && <button className="ft-btn ft-btn--primary" onClick={reset}>New session</button>}
          </div>
        </div>

        <div className="ft-compact-gallery">
          {(Object.keys(PLANTS) as PlantType[]).map(type => (
            <button
              key={type}
              className={`ft-compact-gallery__item ${selectedPlant === type ? 'ft-compact-gallery__item--active' : ''}`}
              onClick={() => { if (isIdle) setSelectedPlant(type); }}
              disabled={!isIdle}
              title={PLANTS[type].label}
            >
              <PixelPlant type={type} progress={1} maxWidth={52} gap={1} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ft">

      {/* ── main area: picker left + timer right ─────────────────── */}
      <div className="ft-main">

          {/* LEFT: plant picker grid */}
        <div className="ft-sidebar">
          <p className="ft-sidebar__label">Plant</p>
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
            {isPaused   && <div className="ft-badge ft-badge--paused">⏸ Paused</div>}
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
            {isIdle     && <button className="ft-btn ft-btn--primary" onClick={() => handleStart(selectedMinutes)}>Start</button>}
            {isRunning  && <button className="ft-btn" onClick={pause}>Pause</button>}
            {isPaused   && <>
              <button className="ft-btn ft-btn--primary" onClick={resume}>Resume</button>
              <button className="ft-btn ft-btn--ghost" onClick={reset}>Abandon</button>
            </>}
            {isFinished && <button className="ft-btn ft-btn--primary" onClick={reset}>New session</button>}
          </div>
        </div>
      </div>

      {/* ── garden (full width below) ─────────────────────────────── */}
      {garden.length > 0 && (
        <div className="ft-garden">
          <h3 className="ft-garden__title">Garden ({garden.length})</h3>
          <div className="ft-garden__grid" onClick={() => setFocusedGardenPlant(null)}>
            {/* decorations — beds + house behind plants */}
            {(['house', 'bed1', 'bed2', 'bed3', 'bed4', 'bed5',
               'fence1', 'fence2', 'fence3', 'fence4', 'fence5'] as DecorationId[])
              .filter(id => !deletedDecos.has(id))
              .map(id => (
                <DraggableDecoration key={id} id={id} initialPos={decoPositions[id]}
                  zIndex={decoZIndexes[id]} onDragEnd={onDecoMove}
                  onDelete={onDecoDelete} onZChange={onDecoZ}>
                  {id === 'house' ? <HouseSprite />
                    : id.startsWith('fence') ? <FenceSectionSprite />
                    : <BedSprite />}
                </DraggableDecoration>
              ))}

            {garden.map((p, i) => (
              <div key={p.id} style={{ zIndex: topPlantId === p.id ? 10 : 1, position: 'absolute', left: 0, top: 0 }}>
                <DraggableGardenPlant
                  plant={p}
                  index={i}
                  initialPos={gardenPositions[p.id] ?? defaultPos(i)}
                  onDragEnd={(id, x, y) => {
                    setGardenPositions(prev => {
                      const updated = { ...prev, [id]: { x, y } };
                      localStorage.setItem(GARDEN_POS_KEY, JSON.stringify(updated));
                      return updated;
                    });
                  }}
                  onPickUp={() => setTopPlantId(p.id)}
                  onRightClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFocusedGardenPlant(prev => prev?.id === p.id ? null : p);
                  }}
                />
              </div>
            ))}

            {/* Plant info popup — shown on right-click, closed by clicking the canvas background. */}
            {focusedGardenPlant && (() => {
              const pos = gardenPositions[focusedGardenPlant.id] ?? defaultPos(garden.findIndex(p => p.id === focusedGardenPlant.id));
              const mins = Math.round(focusedGardenPlant.session_duration / 60);
              const date = new Date(focusedGardenPlant.planted_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
              return (
                <div
                  className="ft-plant-popup"
                  style={{ left: pos.x + 60, top: pos.y - 10 }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="ft-plant-popup__name">{PLANTS[focusedGardenPlant.plant_type as PlantType]?.label ?? focusedGardenPlant.plant_type}</div>
                  <div className="ft-plant-popup__info">{date}</div>
                  <div className="ft-plant-popup__info">{mins} min sesja</div>
                  <button
                    className="ft-plant-popup__delete"
                    onClick={async () => {
                      await focusPlantService.deletePlant(focusedGardenPlant.id);
                      setGarden(prev => prev.filter(p => p.id !== focusedGardenPlant.id));
                      setFocusedGardenPlant(null);
                    }}
                  >
                    Uproot
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusTimer;
