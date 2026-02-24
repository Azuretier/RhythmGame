'use client';

import { type Ref } from 'react';

interface BoardCell {
  color: string;
  ghost?: boolean;
}

interface BoardGridProps {
  board: (BoardCell | null)[];
  width: number;
  boardRef?: Ref<HTMLDivElement>;
  showGhost?: boolean;
  styles: {
    board: string;
    cell: string;
    filled: string;
    ghost?: string;
  };
}

export default function BoardGrid({
  board,
  width,
  boardRef,
  showGhost = true,
  styles,
}: BoardGridProps) {
  return (
    <div
      ref={boardRef}
      className={styles.board}
      style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}
    >
      {board.map((cell, i) => (
        <div
          key={i}
          className={`${styles.cell} ${cell && !cell.ghost ? styles.filled : ''} ${showGhost && cell?.ghost && styles.ghost ? styles.ghost : ''}`}
          style={
            cell && !cell.ghost
              ? { backgroundColor: cell.color, boxShadow: `0 0 8px ${cell.color}40` }
              : showGhost && cell?.ghost
                ? { borderColor: `${cell.color}40` }
                : {}
          }
        />
      ))}
    </div>
  );
}
