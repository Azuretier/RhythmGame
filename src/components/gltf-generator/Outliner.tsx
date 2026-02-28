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
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown,
  LucideIcon,
} from 'lucide-react';
import { SceneObject } from './SceneObjectMesh';

const SHAPE_ICONS: Record<SceneObject['shape'], LucideIcon> = {
  box: Box,
  sphere: Circle,
  cylinder: Cylinder,
  cone: Cone,
  torus: Donut,
  plane: Square,
  icosahedron: Diamond,
  octahedron: Hexagon,
};

export function Outliner({
  objects,
  selectedId,
  onSelect,
  onDelete,
  onDuplicate,
  onToggleVisibility,
  onRename,
}: {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const t = useTranslations('gltfGenerator');
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startRename = (obj: SceneObject) => {
    setEditingId(obj.id);
    setEditName(obj.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col">
      {/* Scene collection header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 px-2 py-1 text-[11px] w-full text-left"
        style={{ color: '#bbb', background: '#2a2a2a', borderBottom: '1px solid #222' }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6a9fd8" strokeWidth="2">
          <path d="M12 3L2 12l10 9 10-9L12 3z" />
        </svg>
        <span className="font-medium">{t('sceneCollection')}</span>
        <span className="ml-auto text-[10px]" style={{ color: '#666' }}>{objects.length}</span>
      </button>

      {!collapsed && (
        <div>
          {objects.length === 0 ? (
            <p className="px-4 py-6 text-[11px] text-center" style={{ color: '#555' }}>
              {t('noObjects')}
            </p>
          ) : (
            objects.map((obj) => {
              const Icon = SHAPE_ICONS[obj.shape];
              const isSelected = obj.id === selectedId;
              const isEditing = editingId === obj.id;

              return (
                <div
                  key={obj.id}
                  onClick={() => onSelect(obj.id)}
                  onDoubleClick={() => startRename(obj)}
                  className="group flex items-center gap-1.5 px-3 py-[3px] cursor-pointer"
                  style={{
                    background: isSelected ? '#264B73' : 'transparent',
                    color: isSelected ? '#fff' : obj.visible ? '#bbb' : '#555',
                    borderLeft: isSelected ? '2px solid #ED7720' : '2px solid transparent',
                  }}
                >
                  <Icon size={13} strokeWidth={1.5} className="shrink-0" style={{ color: isSelected ? '#ED7720' : '#777' }} />

                  {isEditing ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-[#222] text-[11px] px-1 py-0 rounded outline-none"
                      style={{ color: '#ddd', border: '1px solid #4B70A1' }}
                    />
                  ) : (
                    <span className="flex-1 text-[11px] truncate">{obj.name}</span>
                  )}

                  {/* Action buttons on hover */}
                  <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleVisibility(obj.id); }}
                      className="p-0.5 rounded"
                      style={{ color: obj.visible ? '#888' : '#555' }}
                      title={obj.visible ? t('hide') : t('show')}
                    >
                      {obj.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicate(obj.id); }}
                      className="p-0.5 rounded"
                      style={{ color: '#888' }}
                      title={t('duplicate')}
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(obj.id); }}
                      className="p-0.5 rounded"
                      style={{ color: '#a44' }}
                      title={t('delete')}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
