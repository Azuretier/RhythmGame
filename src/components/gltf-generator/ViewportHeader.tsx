'use client';

import { useTranslations } from 'next-intl';
import { Grid3X3, Circle, Box, Eye } from 'lucide-react';
import { ShadingMode } from './GltfGenerator';

const SHADING_MODES: { mode: ShadingMode; Icon: typeof Box; labelKey: string }[] = [
  { mode: 'wireframe', Icon: Grid3X3, labelKey: 'shading.wireframe' },
  { mode: 'solid', Icon: Box, labelKey: 'shading.solid' },
  { mode: 'material', Icon: Circle, labelKey: 'shading.material' },
  { mode: 'rendered', Icon: Eye, labelKey: 'shading.rendered' },
];

export function ViewportHeader({
  shadingMode,
  onSetShadingMode,
  showGrid,
  onToggleGrid,
}: {
  shadingMode: ShadingMode;
  onSetShadingMode: (mode: ShadingMode) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
}) {
  const t = useTranslations('gltfGenerator');

  return (
    <div
      className="flex items-center justify-between px-3 shrink-0"
      style={{ height: 28, background: '#252525', borderBottom: '1px solid #1a1a1a' }}
    >
      {/* Left: viewport label */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium" style={{ color: '#aaa' }}>
          {t('viewport')}
        </span>
      </div>

      {/* Center: shading mode pills */}
      <div className="flex items-center gap-0.5 rounded px-1 py-0.5" style={{ background: '#1D1D1D' }}>
        {SHADING_MODES.map(({ mode, Icon, labelKey }) => (
          <button
            key={mode}
            onClick={() => onSetShadingMode(mode)}
            title={t(labelKey)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors"
            style={{
              background: shadingMode === mode ? '#4B70A1' : 'transparent',
              color: shadingMode === mode ? '#fff' : '#888',
            }}
          >
            <Icon size={12} strokeWidth={1.5} />
          </button>
        ))}
      </div>

      {/* Right: overlays */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleGrid}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors"
          style={{
            background: showGrid ? '#3a3a3a' : 'transparent',
            color: showGrid ? '#ccc' : '#666',
          }}
          title={t('toggleGrid')}
        >
          <Grid3X3 size={11} strokeWidth={1.5} />
          <span>{t('grid')}</span>
        </button>
      </div>
    </div>
  );
}
