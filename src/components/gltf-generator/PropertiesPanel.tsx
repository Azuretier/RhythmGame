'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SceneObject } from './SceneObjectMesh';

/* ───── Blender-style number input with drag support ───── */
function BlenderInput({
  label,
  value,
  onChange,
  step = 0.1,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  color?: string;
}) {
  return (
    <div
      className="flex items-center rounded overflow-hidden"
      style={{ background: '#222', border: '1px solid #1a1a1a' }}
    >
      <span
        className="text-[10px] font-medium px-1.5 py-[3px] shrink-0 select-none"
        style={{ color: color ?? '#999', background: '#2a2a2a', minWidth: 16, textAlign: 'center' }}
      >
        {label}
      </span>
      <input
        type="number"
        value={parseFloat(value.toFixed(4))}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        className="w-full bg-transparent text-[11px] px-1.5 py-[3px] outline-none"
        style={{ color: '#ccc' }}
      />
    </div>
  );
}

/* ───── XYZ vector row ───── */
function Vec3Row({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  value: [number, number, number];
  onChange: (v: [number, number, number]) => void;
  step?: number;
}) {
  const colors = ['#d44', '#6a4', '#48d']; // R G B like Blender
  const labels = ['X', 'Y', 'Z'];

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] w-16 shrink-0 select-none" style={{ color: '#888' }}>{label}</span>
      <div className="flex-1 grid grid-cols-3 gap-0.5">
        {labels.map((axis, i) => (
          <BlenderInput
            key={axis}
            label={axis}
            value={value[i]}
            step={step}
            color={colors[i]}
            onChange={(v) => {
              const next = [...value] as [number, number, number];
              next[i] = v;
              onChange(next);
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ───── Slider matching Blender's style ───── */
function BlenderSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] w-16 shrink-0 select-none" style={{ color: '#888' }}>{label}</span>
      <div
        className="flex-1 relative rounded overflow-hidden cursor-pointer"
        style={{ background: '#222', border: '1px solid #1a1a1a', height: 22 }}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-l"
          style={{ width: `${percent}%`, background: '#4B70A1' }}
        />
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <span
          className="absolute inset-0 flex items-center justify-center text-[11px] pointer-events-none select-none"
          style={{ color: '#ccc' }}
        >
          {value.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

/* ───── Collapsible section ───── */
function Section({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #1a1a1a' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left"
        style={{ background: '#2a2a2a', color: '#bbb' }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {icon}
        <span className="text-[11px] font-medium">{title}</span>
      </button>
      {open && (
        <div className="px-3 py-2 space-y-1.5">
          {children}
        </div>
      )}
    </div>
  );
}

/* ───── Main Properties Panel ───── */
export function PropertiesPanel({
  object,
  onUpdate,
}: {
  object: SceneObject | null;
  onUpdate: (updates: Partial<SceneObject>) => void;
}) {
  const t = useTranslations('gltfGenerator');

  if (!object) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[11px]" style={{ color: '#555' }}>{t('selectObject')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Object name header */}
      <div className="px-3 py-2" style={{ background: '#2a2a2a', borderBottom: '1px solid #1a1a1a' }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: '#ED7720' }}>&#9679;</span>
          <input
            type="text"
            value={object.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="flex-1 bg-[#222] text-[11px] px-2 py-1 rounded outline-none"
            style={{ color: '#ddd', border: '1px solid #1a1a1a' }}
          />
        </div>
      </div>

      {/* Transform section */}
      <Section
        title={t('properties.transform')}
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ED7720" strokeWidth="2">
            <path d="M12 2v20M2 12h20" />
            <path d="M17 7l-5-5-5 5M7 17l5 5 5-5" />
          </svg>
        }
      >
        <Vec3Row
          label={t('properties.position')}
          value={object.position}
          onChange={(position) => onUpdate({ position })}
        />
        <Vec3Row
          label={t('properties.rotation')}
          value={object.rotation}
          onChange={(rotation) => onUpdate({ rotation })}
          step={0.05}
        />
        <Vec3Row
          label={t('properties.scale')}
          value={object.scale}
          onChange={(scale) => onUpdate({ scale })}
        />
      </Section>

      {/* Material section */}
      <Section
        title={t('properties.material')}
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E05080" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
          </svg>
        }
      >
        {/* Color */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] w-16 shrink-0" style={{ color: '#888' }}>{t('properties.color')}</span>
          <div className="flex-1 flex items-center gap-1">
            <input
              type="color"
              value={object.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              style={{ border: '1px solid #1a1a1a' }}
            />
            <input
              type="text"
              value={object.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="flex-1 bg-[#222] text-[11px] px-2 py-[3px] rounded outline-none font-mono"
              style={{ color: '#ccc', border: '1px solid #1a1a1a' }}
            />
          </div>
        </div>

        <BlenderSlider
          label={t('properties.metalness')}
          value={object.metalness}
          onChange={(metalness) => onUpdate({ metalness })}
        />
        <BlenderSlider
          label={t('properties.roughness')}
          value={object.roughness}
          onChange={(roughness) => onUpdate({ roughness })}
        />

        {/* Wireframe */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] w-16 shrink-0" style={{ color: '#888' }}>{t('properties.wireframe')}</span>
          <button
            onClick={() => onUpdate({ wireframe: !object.wireframe })}
            className="w-4 h-4 rounded flex items-center justify-center"
            style={{
              background: object.wireframe ? '#4B70A1' : '#222',
              border: '1px solid #1a1a1a',
            }}
          >
            {object.wireframe && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M2 5l2 2 4-4" />
              </svg>
            )}
          </button>
        </div>
      </Section>
    </div>
  );
}
