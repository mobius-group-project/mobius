/**
 * Garden decoration system for the focus module.
 *
 * Provides pixel-art sprites (house, garden beds, fence sections) that the user
 * can freely drag around the garden canvas. Each decoration's position, z-index,
 * and visibility (deleted or not) are persisted to localStorage and restored on mount.
 *
 * Also exports PixelSprite — the low-level primitive used by both decorations and
 * the plant sprites in FocusTimer.tsx.
 */
import React, { useState, useRef } from 'react';

// ─── types ────────────────────────────────────────────────────────────────────

/**
 * Compact representation of a pixel-art image.
 * Each tuple is [col, row, cssColor] — only colored pixels are listed;
 * everything else is transparent. This avoids storing the full grid.
 */
type SparsePixels = [number, number, string][];

/** Unique identifier for every decoration that can appear in the garden. */
export type DecorationId =
  | 'house'
  | 'bed1' | 'bed2' | 'bed3' | 'bed4' | 'bed5'
  | 'fence1' | 'fence2' | 'fence3' | 'fence4' | 'fence5';

/** Absolute pixel position of a decoration within the garden canvas. */
export type DecoPos = { x: number; y: number };

/** A position entry for every possible decoration. */
export type DecoPositions = Record<DecorationId, DecoPos>;

/**
 * Initial positions for all decorations when the user opens the garden for the first time.
 * Plants occupy the left side (x: 0–440); all decorations start on the right (x: 480+).
 */
export const DECO_DEFAULT: DecoPositions = {
  house:  { x: 720, y: 10 },
  bed1:   { x: 490, y: 200 }, bed2: { x: 600, y: 200 }, bed3: { x: 710, y: 200 },
  bed4:   { x: 490, y: 260 }, bed5: { x: 600, y: 260 },
  fence1: { x: 480, y: 352 }, fence2: { x: 636, y: 352 }, fence3: { x: 792, y: 352 },
  fence4: { x: 480, y: 390 }, fence5: { x: 636, y: 390 },
};

// ─── pixel sprite ─────────────────────────────────────────────────────────────

/**
 * Converts a sparse pixel list to a flat col×row array suitable for grid rendering.
 * Unspecified cells are set to null, which the renderer treats as transparent.
 *
 * @param cols - Number of columns in the grid.
 * @param rows - Number of rows in the grid.
 * @param pixels - Sparse list of colored pixels as [col, row, color] tuples.
 * @returns Flat array of length cols×rows where each entry is a CSS color or null.
 */
function makeGrid(cols: number, rows: number, pixels: SparsePixels): (string | null)[] {
  const g = new Array(cols * rows).fill(null);
  for (const [x, y, c] of pixels) g[y * cols + x] = c;
  return g;
}

/**
 * Renders a pixel-art sprite as a CSS grid of colored divs.
 *
 * @param cols - Number of pixel columns.
 * @param rows - Number of pixel rows.
 * @param px - Size of each pixel in CSS pixels.
 * @param pixels - Sparse pixel data (see SparsePixels).
 */
export function PixelSprite({ cols, rows, px, pixels }: {
  cols: number; rows: number; px: number; pixels: SparsePixels;
}) {
  const grid = makeGrid(cols, rows, pixels);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${px}px)`, imageRendering: 'pixelated' }}>
      {grid.map((color, i) => (
        <div key={i} style={{ width: px, height: px, background: color ?? 'transparent' }} />
      ))}
    </div>
  );
}

// ─── draggable decoration ─────────────────────────────────────────────────────

/** Props for DraggableDecoration. */
interface DraggableDecoProps {
  /** Identifies which decoration this is — used to call back with the correct ID. */
  id: DecorationId;
  /** Starting position on the garden canvas in pixels. */
  initialPos: DecoPos;
  /** CSS z-index controlling layer order relative to other decorations and plants. */
  zIndex?: number;
  /** Called when the user finishes dragging. Receives the new absolute position. */
  onDragEnd: (id: DecorationId, x: number, y: number) => void;
  /** Called when the user clicks "Remove" in the context menu. */
  onDelete: (id: DecorationId) => void;
  /** Called when the user clicks ↑ or ↓ in the context menu. delta is +1 or -1. */
  onZChange: (id: DecorationId, delta: number) => void;
  /** The sprite component to render inside the draggable wrapper. */
  children: React.ReactNode;
}

/**
 * Wraps a decoration sprite with drag-to-reposition behaviour and a right-click context menu.
 *
 * Dragging is implemented with global mousemove/mouseup listeners attached on mousedown
 * so the pointer can move freely outside the element without losing the drag.
 * The `moved` ref distinguishes a real drag from a plain click — onDragEnd is only
 * called if the pointer moved more than 3px, avoiding unnecessary state updates.
 *
 * The context menu lets the user adjust layer order (z-index) or remove the decoration.
 * It closes automatically when the user clicks anywhere outside the element.
 */
export const DraggableDecoration: React.FC<DraggableDecoProps> = ({
  id, initialPos, zIndex = 0, onDragEnd, onDelete, onZChange, children,
}) => {
  const [pos, setPos] = useState(initialPos);
  const [showMenu, setShowMenu] = useState(false);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos   = useRef({ x: 0, y: 0 });
  // Tracks whether the pointer moved enough to count as a drag vs. a click.
  const moved      = useRef(false);

  // Close the context menu when the user clicks anywhere outside this element.
  React.useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    window.addEventListener('mousedown', handler, true);
    return () => window.removeEventListener('mousedown', handler, true);
  }, [showMenu]);

  /** Initiates a drag by attaching temporary global listeners for mousemove and mouseup. */
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    moved.current = false;
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current   = pos;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startMouse.current.x;
      const dy = ev.clientY - startMouse.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      setPos({ x: startPos.current.x + dx, y: startPos.current.y + dy });
    };

    const onUp = (ev: MouseEvent) => {
      const x = startPos.current.x + ev.clientX - startMouse.current.x;
      const y = startPos.current.y + ev.clientY - startMouse.current.y;
      setPos({ x, y });
      if (moved.current) onDragEnd(id, x, y);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  /** Toggles the context menu on right-click. */
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(v => !v);
  };

  /** Fires an z-index change and briefly flashes the button to give visual feedback. */
  const handleZ = (delta: number) => {
    onZChange(id, delta);
    setFlash(delta > 0 ? 'up' : 'down');
    setTimeout(() => setFlash(null), 300);
  };

  const zBtnBase: React.CSSProperties = {
    border: '1px solid rgba(255,255,255,0.18)',
    color: '#fff', borderRadius: 6, fontSize: 11, padding: '2px 7px', cursor: 'pointer',
    transition: 'background 0.15s',
  };

  return (
    <div
      ref={wrapRef}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      style={{ position: 'absolute', left: pos.x, top: pos.y, cursor: 'grab', userSelect: 'none', zIndex }}
    >
      {children}
      {showMenu && (
        <div style={{
          position: 'absolute', top: -44, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--color-card-background, #1f2027)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
          padding: '4px 6px', zIndex: 99, whiteSpace: 'nowrap',
          display: 'flex', gap: 4, alignItems: 'center',
        }}>
          <button
            onMouseDown={e => { e.stopPropagation(); handleZ(1); }}
            style={{ ...zBtnBase, background: flash === 'up' ? 'rgba(246,254,154,0.35)' : 'rgba(255,255,255,0.07)' }}
            title="Bring forward"
          >↑</button>
          <button
            onMouseDown={e => { e.stopPropagation(); handleZ(-1); }}
            style={{ ...zBtnBase, background: flash === 'down' ? 'rgba(246,254,154,0.35)' : 'rgba(255,255,255,0.07)' }}
            title="Send backward"
          >↓</button>
          <button
            onMouseDown={e => { e.stopPropagation(); onDelete(id); setShowMenu(false); }}
            style={{
              background: 'rgba(255,71,71,0.15)', border: '1px solid rgba(255,71,71,0.35)',
              color: '#ff6b6b', borderRadius: 6, fontSize: 11, padding: '2px 8px', cursor: 'pointer',
            }}
          >Remove</button>
        </div>
      )}
    </div>
  );
};

// ─── House (13×13, px=8) ─────────────────────────────────────────────────────
const HOUSE_PX = 8;
const HOUSE_COLS = 13, HOUSE_ROWS = 13;
const HOUSE_PIX: SparsePixels = [
  [6,0,'#8B1A1A'],
  [5,1,'#8B1A1A'],[6,1,'#A52A2A'],[7,1,'#8B1A1A'],
  [4,2,'#8B1A1A'],[5,2,'#A52A2A'],[6,2,'#CD5C5C'],[7,2,'#A52A2A'],[8,2,'#8B1A1A'],
  [3,3,'#8B1A1A'],[4,3,'#A52A2A'],[5,3,'#A52A2A'],[6,3,'#CD5C5C'],[7,3,'#A52A2A'],[8,3,'#A52A2A'],[9,3,'#8B1A1A'],
  [2,4,'#6B0000'],[3,4,'#8B1A1A'],[4,4,'#A52A2A'],[5,4,'#A52A2A'],[6,4,'#CD5C5C'],[7,4,'#A52A2A'],[8,4,'#A52A2A'],[9,4,'#8B1A1A'],[10,4,'#6B0000'],
  [1,5,'#4A2800'],[2,5,'#6B4423'],[3,5,'#5C3317'],[4,5,'#6B4423'],[5,5,'#5C3317'],[6,5,'#6B4423'],[7,5,'#5C3317'],[8,5,'#6B4423'],[9,5,'#5C3317'],[10,5,'#6B4423'],[11,5,'#4A2800'],
  [2,6,'#EDE8D0'],[3,6,'#B8D4E8'],[4,6,'#B8D4E8'],[5,6,'#EDE8D0'],[6,6,'#EDE8D0'],[7,6,'#EDE8D0'],[8,6,'#B8D4E8'],[9,6,'#B8D4E8'],[10,6,'#EDE8D0'],
  [2,7,'#EDE8D0'],[3,7,'#5B9BD5'],[4,7,'#7BB8E8'],[5,7,'#EDE8D0'],[6,7,'#8B4513'],[7,7,'#A0522D'],[8,7,'#5B9BD5'],[9,7,'#7BB8E8'],[10,7,'#EDE8D0'],
  [2,8,'#EDE8D0'],[3,8,'#5B9BD5'],[4,8,'#7BB8E8'],[5,8,'#EDE8D0'],[6,8,'#7B3D13'],[7,8,'#A0522D'],[8,8,'#5B9BD5'],[9,8,'#7BB8E8'],[10,8,'#EDE8D0'],
  [2,9,'#EDE8D0'],[3,9,'#EDE8D0'],[4,9,'#EDE8D0'],[5,9,'#EDE8D0'],[6,9,'#6B3310'],[7,9,'#8B4513'],[8,9,'#EDE8D0'],[9,9,'#EDE8D0'],[10,9,'#EDE8D0'],
  [2,10,'#EDE8D0'],[3,10,'#EDE8D0'],[4,10,'#EDE8D0'],[5,10,'#EDE8D0'],[6,10,'#6B3310'],[7,10,'#8B4513'],[8,10,'#EDE8D0'],[9,10,'#EDE8D0'],[10,10,'#EDE8D0'],
  [2,11,'#EDE8D0'],[3,11,'#EDE8D0'],[4,11,'#EDE8D0'],[5,11,'#EDE8D0'],[6,11,'#6B3310'],[7,11,'#8B4513'],[8,11,'#EDE8D0'],[9,11,'#EDE8D0'],[10,11,'#EDE8D0'],
  [2,12,'#A09060'],[3,12,'#A09060'],[4,12,'#A09060'],[5,12,'#A09060'],[6,12,'#A09060'],[7,12,'#A09060'],[8,12,'#A09060'],[9,12,'#A09060'],[10,12,'#A09060'],
];

/** Pixel-art house sprite (13×13 grid, each pixel 8 CSS px). */
export const HouseSprite: React.FC = () => (
  <PixelSprite cols={HOUSE_COLS} rows={HOUSE_ROWS} px={HOUSE_PX} pixels={HOUSE_PIX} />
);

// ─── Garden bed (10×5, px=9) ─────────────────────────────────────────────────
const BED_PX = 9;
const BED_COLS = 10, BED_ROWS = 5;
const BED_PIX: SparsePixels = [
  [0,0,'#6B4820'],[1,0,'#5C3D11'],[2,0,'#6B4820'],[3,0,'#5C3D11'],[4,0,'#6B4820'],[5,0,'#5C3D11'],[6,0,'#6B4820'],[7,0,'#5C3D11'],[8,0,'#6B4820'],[9,0,'#5C3D11'],
  [0,1,'#5C3D11'],[1,1,'#3E1F00'],[2,1,'#5C3008'],[3,1,'#3E1F00'],[4,1,'#6B3D0F'],[5,1,'#3E1F00'],[6,1,'#5C3008'],[7,1,'#3E1F00'],[8,1,'#6B3D0F'],[9,1,'#5C3D11'],
  [0,2,'#6B4820'],[1,2,'#6B3D0F'],[2,2,'#3E1F00'],[3,2,'#6B3D0F'],[4,2,'#3E1F00'],[5,2,'#5C3008'],[6,2,'#3E1F00'],[7,2,'#6B3D0F'],[8,2,'#3E1F00'],[9,2,'#6B4820'],
  [0,3,'#5C3D11'],[1,3,'#3E1F00'],[2,3,'#6B3D0F'],[3,3,'#3E1F00'],[4,3,'#6B3D0F'],[5,3,'#3E1F00'],[6,3,'#6B3D0F'],[7,3,'#3E1F00'],[8,3,'#5C3008'],[9,3,'#5C3D11'],
  [0,4,'#6B4820'],[1,4,'#5C3D11'],[2,4,'#6B4820'],[3,4,'#5C3D11'],[4,4,'#6B4820'],[5,4,'#5C3D11'],[6,4,'#6B4820'],[7,4,'#5C3D11'],[8,4,'#6B4820'],[9,4,'#5C3D11'],
];

/** Pixel-art garden bed sprite (10×5 grid, each pixel 9 CSS px). */
export const BedSprite: React.FC = () => (
  <PixelSprite cols={BED_COLS} rows={BED_ROWS} px={BED_PX} pixels={BED_PIX} />
);

// ─── Fence section (6 posts + rails, px=4) ────────────────────────────────────
const POST_PX = 4;
const POST_COLS = 3, POST_ROWS = 10;
const POST_PIX: SparsePixels = [
  [1,0,'#E8C070'],
  [0,1,'#8B6914'],[1,1,'#DBA840'],[2,1,'#8B6914'],
  [0,2,'#8B6914'],[1,2,'#C4956A'],[2,2,'#8B6914'],
  [0,3,'#8B6914'],[1,3,'#DBA840'],[2,3,'#8B6914'],
  [0,4,'#8B6914'],[1,4,'#C4956A'],[2,4,'#8B6914'],
  [0,5,'#8B6914'],[1,5,'#DBA840'],[2,5,'#8B6914'],
  [0,6,'#8B6914'],[1,6,'#C4956A'],[2,6,'#8B6914'],
  [0,7,'#8B6914'],[1,7,'#DBA840'],[2,7,'#8B6914'],
  [0,8,'#8B6914'],[1,8,'#C4956A'],[2,8,'#8B6914'],
  [0,9,'#8B6914'],[1,9,'#A07828'],[2,9,'#8B6914'],
];

// Layout constants for a fence section: 6 evenly spaced posts with 2 horizontal rails.
const SECTION_POSTS = 6;
const POST_STEP = 26;          // distance in CSS px between post centres
const SECTION_W = SECTION_POSTS * POST_STEP;
const SECTION_H = POST_ROWS * POST_PX;

/**
 * Pixel-art fence section sprite.
 * Renders 6 wooden posts positioned absolutely with two horizontal rail divs
 * overlaid at fixed row heights to connect them.
 */
export const FenceSectionSprite: React.FC = () => (
  <div style={{ position: 'relative', width: SECTION_W, height: SECTION_H }}>
    {/* Two horizontal rails at row 3 and row 7 of the post grid. */}
    {[POST_PX * 3, POST_PX * 7].map(top => (
      <div key={top} style={{
        position: 'absolute', left: 0, width: SECTION_W,
        top, height: 3, background: '#A07828', opacity: 0.9,
        pointerEvents: 'none',
      }} />
    ))}
    {Array.from({ length: SECTION_POSTS }, (_, i) => (
      <div key={i} style={{ position: 'absolute', left: i * POST_STEP, top: 0 }}>
        <PixelSprite cols={POST_COLS} rows={POST_ROWS} px={POST_PX} pixels={POST_PIX} />
      </div>
    ))}
  </div>
);
