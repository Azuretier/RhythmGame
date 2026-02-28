'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { SceneObject } from './SceneObjectMesh';

function NumberInput({
  label,
  value,
  onChange,
  step = 0.1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] uppercase text-white/40 w-4 shrink-0">{label}</label>
      <input
        type="number"
        value={parseFloat(value.toFixed(3))}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-azure-500/50"
      />
    </div>
  );
}

function Vec3Input({
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
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-white/40">{label}</label>
      <div className="grid grid-cols-3 gap-1">
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <NumberInput
            key={axis}
            label={axis}
            value={value[i]}
            step={step}
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

function SliderInput({
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
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-wider text-white/40">{label}</label>
        <span className="text-[10px] text-white/30">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-azure-500"
      />
    </div>
  );
}

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
      <div className="w-64 border-l border-white/10 bg-[#111] flex items-center justify-center shrink-0">
        <p className="text-xs text-white/20">{t('selectObject')}</p>
      </div>
    );
  }

  return (
    <div className="w-64 border-l border-white/10 bg-[#111] overflow-y-auto shrink-0">
      {/* Name */}
      <div className="p-3 border-b border-white/10">
        <label className="text-[10px] uppercase tracking-wider text-white/40">{t('properties.name')}</label>
        <input
          type="text"
          value={object.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="mt-1 w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-azure-500/50"
        />
      </div>

      {/* Transform */}
      <div className="p-3 border-b border-white/10 space-y-3">
        <h3 className="text-[11px] font-medium text-white/60">{t('properties.transform')}</h3>
        <Vec3Input
          label={t('properties.position')}
          value={object.position}
          onChange={(position) => onUpdate({ position })}
        />
        <Vec3Input
          label={t('properties.rotation')}
          value={object.rotation}
          onChange={(rotation) => onUpdate({ rotation })}
          step={0.05}
        />
        <Vec3Input
          label={t('properties.scale')}
          value={object.scale}
          onChange={(scale) => onUpdate({ scale })}
        />
      </div>

      {/* Material */}
      <div className="p-3 border-b border-white/10 space-y-3">
        <h3 className="text-[11px] font-medium text-white/60">{t('properties.material')}</h3>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-white/40">{t('properties.color')}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={object.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={object.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/80 font-mono focus:outline-none focus:border-azure-500/50"
            />
          </div>
        </div>

        <SliderInput
          label={t('properties.metalness')}
          value={object.metalness}
          onChange={(metalness) => onUpdate({ metalness })}
        />
        <SliderInput
          label={t('properties.roughness')}
          value={object.roughness}
          onChange={(roughness) => onUpdate({ roughness })}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="wireframe"
            checked={object.wireframe}
            onChange={(e) => onUpdate({ wireframe: e.target.checked })}
            className={cn(
              'w-3.5 h-3.5 rounded border cursor-pointer appearance-none',
              object.wireframe
                ? 'bg-azure-500 border-azure-500'
                : 'bg-white/5 border-white/20'
            )}
          />
          <label htmlFor="wireframe" className="text-xs text-white/60 cursor-pointer">
            {t('properties.wireframe')}
          </label>
        </div>
      </div>
    </div>
  );
}
