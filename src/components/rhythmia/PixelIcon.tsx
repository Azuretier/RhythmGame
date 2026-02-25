'use client';

import React from 'react';

interface PixelIconData {
  grid: string[];
  color: string;
}

function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return '#' +
    Math.min(255, Math.round(r + (255 - r) * amount)).toString(16).padStart(2, '0') +
    Math.min(255, Math.round(g + (255 - g) * amount)).toString(16).padStart(2, '0') +
    Math.min(255, Math.round(b + (255 - b) * amount)).toString(16).padStart(2, '0');
}

function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return '#' +
    Math.max(0, Math.round(r * (1 - amount))).toString(16).padStart(2, '0') +
    Math.max(0, Math.round(g * (1 - amount))).toString(16).padStart(2, '0') +
    Math.max(0, Math.round(b * (1 - amount))).toString(16).padStart(2, '0');
}

// Each icon is an 8x8 pixel grid. '#' = filled pixel, '.' = empty.
// Shading is applied automatically via edge detection (top-left highlight, bottom-right shadow).
const ICONS: Record<string, PixelIconData> = {
  lines: {
    grid: [
      '........',
      '.######.',
      '........',
      '..####..',
      '........',
      '.######.',
      '........',
      '........',
    ],
    color: '#4fc3f7',
  },
  target: {
    grid: [
      '..####..',
      '.#....#.',
      '#..##..#',
      '#.#..#.#',
      '#..##..#',
      '.#....#.',
      '..####..',
      '........',
    ],
    color: '#ef5350',
  },
  spin: {
    grid: [
      '..####..',
      '.#......',
      '..###...',
      '.....#..',
      '..###...',
      '......#.',
      '..####..',
      '........',
    ],
    color: '#ab47bc',
  },
  spark: {
    grid: [
      '...#....',
      '..###...',
      '.##.##..',
      '#..#..#.',
      '.##.##..',
      '..###...',
      '...#....',
      '........',
    ],
    color: '#ce93d8',
  },
  gem: {
    grid: [
      '...##...',
      '..####..',
      '.######.',
      '########',
      '.######.',
      '..####..',
      '...##...',
      '........',
    ],
    color: '#26c6da',
  },
  star: {
    grid: [
      '...#....',
      '..###...',
      '.#####..',
      '########',
      '..####..',
      '.##..##.',
      '.#....#.',
      '........',
    ],
    color: '#ffd54f',
  },
  flame: {
    grid: [
      '...#....',
      '..##....',
      '.###.#..',
      '.#####..',
      '.####...',
      '..###...',
      '...#....',
      '........',
    ],
    color: '#ff7043',
  },
  burst: {
    grid: [
      '#..#..#.',
      '.#.#.#..',
      '..###...',
      '###.###.',
      '..###...',
      '.#.#.#..',
      '#..#..#.',
      '........',
    ],
    color: '#ff5252',
  },
  controller: {
    grid: [
      '........',
      '..####..',
      '.######.',
      '##.##.##',
      '.######.',
      '..#..#..',
      '........',
      '........',
    ],
    color: '#66bb6a',
  },
  globe: {
    grid: [
      '..####..',
      '.#.##.#.',
      '#..##..#',
      '########',
      '#..##..#',
      '.#.##.#.',
      '..####..',
      '........',
    ],
    color: '#42a5f5',
  },
  firework: {
    grid: [
      '.#.#.#..',
      '..###...',
      '.#####..',
      '..###...',
      '...#....',
      '...#....',
      '...#....',
      '........',
    ],
    color: '#ffab40',
  },
  note: {
    grid: [
      '..####..',
      '..#.....',
      '..#.....',
      '..#.....',
      '..#.....',
      '.##.....',
      '.##.....',
      '........',
    ],
    color: '#ec407a',
  },
  notes: {
    grid: [
      '.######.',
      '.#....#.',
      '.#....#.',
      '.#....#.',
      '.#....#.',
      '##...##.',
      '##...##.',
      '........',
    ],
    color: '#f48fb1',
  },
  bolt: {
    grid: [
      '....##..',
      '...##...',
      '..###...',
      '.#####..',
      '...##...',
      '..##....',
      '.##.....',
      '........',
    ],
    color: '#ffee58',
  },
  brick: {
    grid: [
      '########',
      '#..#...#',
      '########',
      '##...#.#',
      '########',
      '#..#...#',
      '########',
      '........',
    ],
    color: '#8d6e63',
  },
  puzzle: {
    grid: [
      '..##....',
      '.####...',
      '..##....',
      '.######.',
      '.#...##.',
      '.#...##.',
      '.######.',
      '........',
    ],
    color: '#7e57c2',
  },
  trophy: {
    grid: [
      '########',
      '.######.',
      '.######.',
      '..####..',
      '...##...',
      '...##...',
      '..####..',
      '........',
    ],
    color: '#ffd600',
  },
  crown: {
    grid: [
      '#..#..#.',
      '##.#.##.',
      '#######.',
      '.#####..',
      '.#####..',
      '.#####..',
      '........',
      '........',
    ],
    color: '#ffab00',
  },
  swords: {
    grid: [
      '#.....#.',
      '.#...#..',
      '..#.#...',
      '...#....',
      '..#.#...',
      '.#...#..',
      '#.....#.',
      '........',
    ],
    color: '#90a4ae',
  },
  steps: {
    grid: [
      '.....##.',
      '.....##.',
      '...##...',
      '...##...',
      '.##.....',
      '.##.....',
      '........',
      '........',
    ],
    color: '#a1887f',
  },
  ballot: {
    grid: [
      '########',
      '#......#',
      '#....#.#',
      '#...##.#',
      '##.##..#',
      '#.##...#',
      '#......#',
      '########',
    ],
    color: '#9ccc65',
  },
  lock: {
    grid: [
      '..####..',
      '.#....#.',
      '.#....#.',
      '########',
      '#.####.#',
      '#.####.#',
      '########',
      '........',
    ],
    color: '#757575',
  },
  coin: {
    grid: [
      '..####..',
      '.######.',
      '########',
      '########',
      '########',
      '.######.',
      '..####..',
      '........',
    ],
    color: '#ffc107',
  },
  chest: {
    grid: [
      '.######.',
      '########',
      '########',
      '.######.',
      '.######.',
      '.#.##.#.',
      '.######.',
      '........',
    ],
    color: '#8d6e63',
  },
  element: {
    grid: [
      '...##...',
      '..#..#..',
      '.#.##.#.',
      '##.##.##',
      '##.##.##',
      '.#.##.#.',
      '..#..#..',
      '...##...',
    ],
    color: '#26a69a',
  },
  steam: {
    grid: [
      '.#...#..',
      '..#.#...',
      '.#...#..',
      '..#.#...',
      '...#....',
      '..###...',
      '.#####..',
      '........',
    ],
    color: '#80cbc4',
  },
  dark: {
    grid: [
      '..####..',
      '.######.',
      '####..##',
      '###...##',
      '###...##',
      '####..##',
      '.######.',
      '..####..',
    ],
    color: '#7c4dff',
  },
  skull: {
    grid: [
      '..####..',
      '.######.',
      '##.##.##',
      '.######.',
      '..####..',
      '...##...',
      '..####..',
      '........',
    ],
    color: '#b0bec5',
  },
  gear: {
    grid: [
      '.#.##.#.',
      '.######.',
      '##....##',
      '########',
      '########',
      '##....##',
      '.######.',
      '.#.##.#.',
    ],
    color: '#78909c',
  },
  recycle: {
    grid: [
      '..####..',
      '.#..#.#.',
      '....#.#.',
      '..####..',
      '..####..',
      '.#.#....',
      '.#.#..#.',
      '..####..',
    ],
    color: '#66bb6a',
  },
};

interface Props {
  name: string;
  size?: number;
}

export const PixelIcon: React.FC<Props> = ({ name, size = 24 }) => {
  const icon = ICONS[name];
  if (!icon) return <span>{name}</span>;

  const { grid, color } = icon;
  const highlight = lightenColor(color, 0.35);
  const shadow = darkenColor(color, 0.35);
  const rects: React.ReactElement[] = [];

  const isEmpty = (x: number, y: number) => {
    if (y < 0 || y >= grid.length) return true;
    if (x < 0 || x >= grid[y].length) return true;
    return grid[y][x] !== '#';
  };

  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') {
        // Directional lighting: top-left is light source
        let score = 0;
        if (isEmpty(x, y - 1)) score += 1; // top edge exposed to light
        if (isEmpty(x - 1, y)) score += 1; // left edge exposed to light
        if (isEmpty(x, y + 1)) score -= 1; // bottom edge in shadow
        if (isEmpty(x + 1, y)) score -= 1; // right edge in shadow

        let fillColor = color;
        if (score > 0) fillColor = highlight;
        else if (score < 0) fillColor = shadow;

        rects.push(
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fillColor} />
        );
      }
    }
  }

  return (
    <svg
      viewBox="0 0 8 8"
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated' }}
      aria-label={name}
    >
      {rects}
    </svg>
  );
};

export default PixelIcon;
