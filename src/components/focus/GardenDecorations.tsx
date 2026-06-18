import React, { useState, useRef } from 'react';

// ─── types ────────────────────────────────────────────────────────────────────
type SparsePixels = [number, number, string][];

export type DecorationId =
  | 'house'
  | 'bed1' | 'bed2' | 'bed3' | 'bed4' | 'bed5'
  | 'fence1' | 'fence2' | 'fence3' | 'fence4' | 'fence5';

export type DecoPos = { x: number; y: number };
export type DecoPositions = Record<DecorationId, DecoPos>;

export const DECO_DEFAULT: DecoPositions = {
  house:  { x: 680, y: 12 },
  bed1:   { x: 20,  y: 285 }, bed2: { x: 140, y: 285 }, bed3: { x: 260, y: 285 },
  bed4:   { x: 20,  y: 348 }, bed5: { x: 140, y: 348 },
  fence1: { x: 0,   y: 368 }, fence2: { x: 156, y: 368 },
  fence3: { x: 312, y: 368 }, fence4: { x: 468, y: 368 },
  fence5: { x: 624, y: 368 },
};

// ─── pixel sprite ─────────────────────────────────────────────────────────────
function makeGrid(cols: number, rows: number, pixels: SparsePixels): (string | null)[] {
  const g = new Array(cols * rows).fill(null);
  for (const [x, y, c] of pixels) g[y * cols + x] = c;
  return g;
}

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
interface DraggableDecoProps {
  id: DecorationId;
  initialPos: DecoPos;
  zIndex?: number;
  onDragEnd: (id: DecorationId, x: number, y: number) => void;
  onDelete: (id: DecorationId) => void;
  children: React.ReactNode;
}

export const DraggableDecoration: React.FC<DraggableDecoProps> = ({
  id, initialPos, zIndex = 0, onDragEnd, onDelete, children,
}) => {
  const [pos, setPos] = useState(initialPos);
  const [showDelete, setShowDelete] = useState(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos   = useRef({ x: 0, y: 0 });
  const moved      = useRef(false);

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

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDelete(v => !v);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      style={{ position: 'absolute', left: pos.x, top: pos.y, cursor: 'grab', userSelect: 'none', zIndex }}
    >
      {children}
      {showDelete && (
        <div style={{
          position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--color-card-background, #1f2027)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
          padding: '4px 10px', zIndex: 99, whiteSpace: 'nowrap',
        }}>
          <button
            onMouseDown={e => { e.stopPropagation(); onDelete(id); setShowDelete(false); }}
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

const SECTION_POSTS = 6;
const POST_STEP = 26;
const SECTION_W = SECTION_POSTS * POST_STEP;
const SECTION_H = POST_ROWS * POST_PX;

export const FenceSectionSprite: React.FC = () => (
  <div style={{ position: 'relative', width: SECTION_W, height: SECTION_H }}>
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
