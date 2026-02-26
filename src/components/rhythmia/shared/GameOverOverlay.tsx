'use client';

interface GameOverOverlayProps {
  title: string;
  onAction: () => void;
  actionLabel: string;
  children: React.ReactNode;
  styles: {
    gameOverOverlay: string;
    gameOverTitle: string;
    backBtn: string;
  };
}

export default function GameOverOverlay({
  title,
  onAction,
  actionLabel,
  children,
  styles,
}: GameOverOverlayProps) {
  return (
    <div className={styles.gameOverOverlay}>
      <h2 className={styles.gameOverTitle}>{title}</h2>
      {children}
      <button className={styles.backBtn} onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
