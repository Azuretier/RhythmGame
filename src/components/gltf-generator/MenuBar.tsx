'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ShapeType } from './GltfGenerator';

interface MenuItemDef {
  label: string;
  action?: () => void;
  disabled?: boolean;
  separator?: boolean;
  shortcut?: string;
  submenu?: MenuItemDef[];
}

function MenuItem({ item, onClose }: { item: MenuItemDef; onClose: () => void }) {
  if (item.separator) {
    return <div className="my-1" style={{ borderTop: '1px solid #444' }} />;
  }
  return (
    <button
      onClick={() => {
        if (item.action && !item.disabled) {
          item.action();
          onClose();
        }
      }}
      disabled={item.disabled}
      className="w-full flex items-center justify-between px-4 py-1 text-[12px] text-left transition-colors"
      style={{
        color: item.disabled ? '#555' : '#ccc',
        cursor: item.disabled ? 'default' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!item.disabled) (e.target as HTMLElement).style.background = '#4B70A1';
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.background = 'transparent';
      }}
    >
      <span>{item.label}</span>
      {item.shortcut && <span style={{ color: '#777' }}>{item.shortcut}</span>}
    </button>
  );
}

function DropdownMenu({
  label,
  items,
  isOpen,
  onOpen,
  onClose,
}: {
  label: string;
  items: MenuItemDef[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => (isOpen ? onClose() : onOpen())}
        className="px-3 py-1 text-[12px] rounded transition-colors"
        style={{
          background: isOpen ? '#4B70A1' : 'transparent',
          color: isOpen ? '#fff' : '#bbb',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) (e.target as HTMLElement).style.background = '#3a3a3a';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) (e.target as HTMLElement).style.background = 'transparent';
        }}
      >
        {label}
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-0.5 py-1 rounded shadow-xl z-50 min-w-[200px]"
          style={{ background: '#303030', border: '1px solid #1a1a1a' }}
        >
          {items.map((item, i) => (
            <MenuItem key={i} item={item} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

const MESH_SHAPES: ShapeType[] = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'icosahedron', 'octahedron'];

export function MenuBar({
  onAdd,
  onExportGltf,
  onExportGlb,
  onClearScene,
  onDelete,
  onDuplicate,
  canExport,
  exporting,
}: {
  onAdd: (shape: ShapeType) => void;
  onExportGltf: () => void;
  onExportGlb: () => void;
  onClearScene: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  canExport: boolean;
  exporting: boolean;
}) {
  const t = useTranslations('gltfGenerator');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fileItems: MenuItemDef[] = [
    { label: t('menu.newScene'), action: onClearScene },
    { separator: true, label: '' },
    { label: t('exportGltf'), action: onExportGltf, disabled: !canExport },
    { label: t('exportGlb'), action: onExportGlb, disabled: !canExport || exporting, shortcut: '' },
  ];

  const editItems: MenuItemDef[] = [
    { label: t('duplicate'), action: onDuplicate, disabled: !onDuplicate, shortcut: 'Shift+D' },
    { label: t('delete'), action: onDelete, disabled: !onDelete, shortcut: 'X' },
    { separator: true, label: '' },
    { label: t('menu.selectAll'), shortcut: 'A', disabled: true },
  ];

  const addItems: MenuItemDef[] = MESH_SHAPES.map((shape) => ({
    label: t(`shapes.${shape}`),
    action: () => onAdd(shape),
  }));

  return (
    <div
      className="flex items-center px-1 shrink-0"
      style={{ height: 30, background: '#303030', borderBottom: '1px solid #1a1a1a' }}
    >
      {/* Blender-style icon / logo */}
      <div className="flex items-center justify-center w-8 h-full" style={{ color: '#6a9fd8' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3L2 12l10 9 10-9L12 3z" />
          <path d="M12 8l-5 4.5L12 17l5-4.5L12 8z" />
        </svg>
      </div>

      <DropdownMenu
        label={t('menu.file')}
        items={fileItems}
        isOpen={openMenu === 'file'}
        onOpen={() => setOpenMenu('file')}
        onClose={() => setOpenMenu(null)}
      />
      <DropdownMenu
        label={t('menu.edit')}
        items={editItems}
        isOpen={openMenu === 'edit'}
        onOpen={() => setOpenMenu('edit')}
        onClose={() => setOpenMenu(null)}
      />
      <DropdownMenu
        label={t('menu.add')}
        items={addItems}
        isOpen={openMenu === 'add'}
        onOpen={() => setOpenMenu('add')}
        onClose={() => setOpenMenu(null)}
      />
    </div>
  );
}
