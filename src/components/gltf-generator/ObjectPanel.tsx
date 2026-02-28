'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Box,
  Circle,
  Cylinder,
  Cone,
  Donut,
  Square,
  Diamond,
  Hexagon,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SceneObject } from './SceneObjectMesh';
import { ShapeType } from './GltfGenerator';

const SHAPE_ICONS: Record<ShapeType, LucideIcon> = {
  box: Box,
  sphere: Circle,
  cylinder: Cylinder,
  cone: Cone,
  torus: Donut,
  plane: Square,
  icosahedron: Diamond,
  octahedron: Hexagon,
};

const SHAPE_OPTIONS: ShapeType[] = [
  'box',
  'sphere',
  'cylinder',
  'cone',
  'torus',
  'plane',
  'icosahedron',
  'octahedron',
];

export function ObjectPanel({
  objects,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
  onToggleVisibility,
}: {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (shape: ShapeType) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}) {
  const t = useTranslations('gltfGenerator');
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="w-56 border-r border-white/10 bg-[#111] flex flex-col shrink-0">
      {/* Add button */}
      <div className="p-2 border-b border-white/10">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded bg-azure-500 hover:bg-azure-600 text-white transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} />
          {t('addShape')}
          {showAddMenu ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {showAddMenu && (
          <div className="mt-2 grid grid-cols-2 gap-1">
            {SHAPE_OPTIONS.map((shape) => {
              const Icon = SHAPE_ICONS[shape];
              return (
                <button
                  key={shape}
                  onClick={() => {
                    onAdd(shape);
                    setShowAddMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <Icon size={14} />
                  {t(`shapes.${shape}`)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Object list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-1.5 text-[10px] uppercase tracking-wider text-white/30 px-3">
          {t('sceneObjects')}
        </div>
        {objects.length === 0 ? (
          <p className="px-3 py-4 text-xs text-white/20 text-center">{t('noObjects')}</p>
        ) : (
          objects.map((obj) => {
            const Icon = SHAPE_ICONS[obj.shape];
            return (
              <div
                key={obj.id}
                onClick={() => onSelect(obj.id)}
                className={cn(
                  'group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors',
                  selectedId === obj.id
                    ? 'bg-azure-500/20 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                )}
              >
                <Icon size={14} className="shrink-0" />
                <span className="flex-1 text-xs truncate">{obj.name}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(obj.id);
                    }}
                    className="p-0.5 rounded hover:bg-white/10"
                    title={obj.visible ? t('hide') : t('show')}
                  >
                    {obj.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(obj.id);
                    }}
                    className="p-0.5 rounded hover:bg-white/10"
                    title={t('duplicate')}
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(obj.id);
                    }}
                    className="p-0.5 rounded hover:bg-red-500/30 text-red-400"
                    title={t('delete')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
