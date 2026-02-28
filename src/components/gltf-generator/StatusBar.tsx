'use client';

import { useTranslations } from 'next-intl';
import { SceneObject } from './SceneObjectMesh';
import { TransformMode } from './GltfGenerator';

export function StatusBar({
  objectCount,
  selectedObject,
  transformMode,
}: {
  objectCount: number;
  selectedObject: SceneObject | null;
  transformMode: TransformMode;
}) {
  const t = useTranslations('gltfGenerator');

  return (
    <div
      className="flex items-center justify-between px-3 shrink-0"
      style={{ height: 24, background: '#303030', borderTop: '1px solid #1a1a1a' }}
    >
      {/* Left: object info */}
      <div className="flex items-center gap-3 text-[11px]" style={{ color: '#888' }}>
        <span>{t('status.objects')}: {objectCount}</span>
        {selectedObject && (
          <>
            <span style={{ color: '#555' }}>|</span>
            <span style={{ color: '#aaa' }}>{selectedObject.name}</span>
            <span style={{ color: '#555' }}>|</span>
            <span>
              {t('status.location')}: {selectedObject.position.map((v) => v.toFixed(2)).join(', ')}
            </span>
          </>
        )}
      </div>

      {/* Right: mode + shortcuts */}
      <div className="flex items-center gap-3 text-[11px]" style={{ color: '#666' }}>
        <span>
          {t(`status.mode.${transformMode}`)}
        </span>
        <span style={{ color: '#444' }}>|</span>
        <span>X {t('status.delete')} &middot; Shift+D {t('status.duplicate')} &middot; H {t('status.hideToggle')}</span>
      </div>
    </div>
  );
}
