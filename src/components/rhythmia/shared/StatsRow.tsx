'use client';

interface Stat {
  label: string;
  value: string | number;
  show?: boolean;
}

interface StatsRowProps {
  stats: Stat[];
  className: string;
}

export default function StatsRow({ stats, className }: StatsRowProps) {
  return (
    <div className={className}>
      {stats
        .filter((s) => s.show !== false)
        .map((stat) => (
          <span key={stat.label}>
            {stat.label}: {stat.value}
          </span>
        ))}
    </div>
  );
}
