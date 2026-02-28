'use client';

interface PlayerHeaderProps {
  name: string;
  score: number;
  styles: {
    header: string;
    name: string;
    score: string;
  };
}

export default function PlayerHeader({ name, score, styles }: PlayerHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.name}>{name}</div>
      <div className={styles.score}>{score.toLocaleString()}</div>
    </div>
  );
}
