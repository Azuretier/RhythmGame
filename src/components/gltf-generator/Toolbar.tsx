'use client';

import { MousePointer2, Move, RotateCcw, Maximize } from 'lucide-react';
import { TransformMode } from './GltfGenerator';

const TOOLS: { mode: TransformMode; Icon: typeof Move; shortcut: string; label: string }[] = [
  { mode: 'cursor', Icon: MousePointer2, shortcut: '', label: 'Cursor' },
  { mode: 'grab', Icon: Move, shortcut: 'G', label: 'Move' },
  { mode: 'rotate', Icon: RotateCcw, shortcut: 'R', label: 'Rotate' },
  { mode: 'scale', Icon: Maximize, shortcut: 'S', label: 'Scale' },
];

export function Toolbar({
  transformMode,
  onSetTransformMode,
}: {
  transformMode: TransformMode;
  onSetTransformMode: (mode: TransformMode) => void;
}) {
  return (
    <div
      className="flex flex-col items-center py-2 gap-0.5 shrink-0"
      style={{ width: 40, background: '#303030', borderRight: '1px solid #1a1a1a' }}
    >
      {TOOLS.map(({ mode, Icon, shortcut, label }) => (
        <button
          key={mode}
          onClick={() => onSetTransformMode(mode)}
          title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
          className="relative w-8 h-8 flex items-center justify-center rounded transition-colors"
          style={{
            background: transformMode === mode ? '#4B70A1' : 'transparent',
            color: transformMode === mode ? '#fff' : '#999',
          }}
        >
          <Icon size={16} strokeWidth={1.5} />
        </button>
      ))}

      <div className="w-5 my-2" style={{ borderTop: '1px solid #444' }} />
    </div>
  );
}
