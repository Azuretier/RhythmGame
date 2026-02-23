import React from 'react';

interface ItemIconProps {
    itemId: string;
    size?: number;
    className?: string;
}

// ===== Isometric 3D Constants =====
const COS30 = 0.866025;
const SIN30 = 0.5;

// Pixel grid resolution per face
const GRID = 5;
const CELL = 1 / GRID;

// ===== Isometric Coordinate Transform =====
// Converts UV (0-1) face-space coordinates to screen (x,y)
function fp(
    face: 'top' | 'left' | 'right',
    u: number, v: number,
    cx: number, cy: number, e: number,
): [number, number] {
    switch (face) {
        case 'top':
            // Origin=center, U→topRight, V→topLeft
            return [
                cx + u * e * COS30 - v * e * COS30,
                cy - u * e * SIN30 - v * e * SIN30,
            ];
        case 'left':
            // Origin=topLeft, U→center(right), V→bottomLeft(down)
            return [
                cx - e * COS30 + u * e * COS30,
                cy - e * SIN30 + u * e * SIN30 + v * e,
            ];
        case 'right':
            // Origin=center, U→topRight, V→bottom(down)
            return [
                cx + u * e * COS30,
                cy - u * e * SIN30 + v * e,
            ];
    }
}

// Build polygon points string for a face-space pixel rectangle
function pixelPoly(
    face: 'top' | 'left' | 'right',
    u: number, v: number, du: number, dv: number,
    cx: number, cy: number, e: number,
): string {
    return [
        fp(face, u, v, cx, cy, e),
        fp(face, u + du, v, cx, cy, e),
        fp(face, u + du, v + dv, cx, cy, e),
        fp(face, u, v + dv, cx, cy, e),
    ].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

// ===== Ore Texture Grids (5x5 per face) =====
// 0 = stone base, 1 = ore spot, 2 = stone variant (darker/lighter)
type FaceGrid = number[][];
type OreTexture = { top: FaceGrid; left: FaceGrid; right: FaceGrid };

const ORE_TEXTURES: Record<string, OreTexture> = {
    stone: {
        top:   [[2,0,2,0,2],[0,2,0,2,0],[2,0,2,0,2],[0,2,0,2,0],[2,0,2,0,2]],
        left:  [[0,2,0,2,0],[2,0,2,0,2],[0,2,0,2,0],[2,0,2,0,2],[0,2,0,2,0]],
        right: [[2,0,0,2,0],[0,2,2,0,2],[2,0,0,2,0],[0,2,2,0,2],[2,0,0,2,0]],
    },
    iron: {
        top:   [[0,1,1,0,0],[0,0,0,0,2],[2,0,0,1,0],[0,0,0,0,0],[1,0,0,1,2]],
        left:  [[0,0,2,0,0],[0,1,1,0,2],[0,0,0,0,0],[2,0,0,1,1],[0,0,2,0,0]],
        right: [[0,2,1,0,0],[0,0,0,0,2],[1,1,0,0,0],[0,0,0,2,0],[0,0,0,1,2]],
    },
    crystal: {
        top:   [[0,0,1,0,2],[2,0,0,1,0],[0,0,0,0,0],[1,1,0,0,2],[0,0,2,0,1]],
        left:  [[1,0,0,2,0],[0,0,0,0,0],[2,0,1,1,0],[0,0,0,0,2],[0,2,0,0,1]],
        right: [[0,2,0,0,1],[0,0,0,0,0],[0,1,0,2,0],[2,0,0,0,0],[1,0,2,0,0]],
    },
    gold: {
        top:   [[1,0,0,2,0],[0,0,1,0,0],[2,0,0,0,2],[0,0,0,0,0],[0,1,2,0,1]],
        left:  [[0,0,1,0,2],[2,0,0,0,0],[1,0,2,0,0],[0,0,0,0,2],[0,2,0,1,0]],
        right: [[0,1,0,0,2],[0,0,0,0,0],[2,0,1,0,0],[0,0,0,2,0],[0,0,2,0,1]],
    },
    obsidian: {
        top:   [[1,0,2,0,1],[0,0,0,1,0],[2,1,0,0,2],[0,0,0,0,0],[1,0,2,1,0]],
        left:  [[0,1,0,2,0],[2,0,0,0,1],[0,0,2,0,0],[1,0,0,0,2],[0,2,0,1,0]],
        right: [[2,0,1,0,0],[0,0,0,2,0],[1,0,0,0,1],[0,2,0,0,0],[0,0,1,2,0]],
    },
    star: {
        top:   [[0,2,1,0,2],[0,0,0,0,0],[2,0,0,2,0],[1,0,0,0,0],[0,2,0,0,1]],
        left:  [[2,1,0,0,0],[0,0,0,2,0],[0,0,0,0,1],[0,2,0,0,0],[1,0,2,0,0]],
        right: [[1,0,0,2,0],[0,0,0,0,0],[2,0,0,0,1],[0,0,2,0,0],[0,2,0,1,2]],
    },
};

// ===== Ore Color Definitions =====
type FaceColors = { top: string; left: string; right: string };
type OreColors = {
    stone: FaceColors;
    stoneAlt: FaceColors;
    ore: FaceColors;
    edge: string;
    glow?: string;
};

const ORE_COLORS: Record<string, OreColors> = {
    stone: {
        stone:    { top: '#9E9E9E', left: '#6E6E6E', right: '#838383' },
        stoneAlt: { top: '#8C8C8C', left: '#5F5F5F', right: '#757575' },
        ore:      { top: '#ABABAB', left: '#7D7D7D', right: '#919191' },
        edge: '#505050',
    },
    iron: {
        stone:    { top: '#9E9E9E', left: '#6E6E6E', right: '#838383' },
        stoneAlt: { top: '#8E8E8E', left: '#626262', right: '#787878' },
        ore:      { top: '#D4B896', left: '#9E7B55', right: '#BA9878' },
        edge: '#505050',
    },
    crystal: {
        stone:    { top: '#9E9E9E', left: '#6E6E6E', right: '#838383' },
        stoneAlt: { top: '#8E8E8E', left: '#626262', right: '#787878' },
        ore:      { top: '#5CE8F2', left: '#2A9BA3', right: '#40CCD6' },
        edge: '#505050',
        glow: 'rgba(79,195,247,0.25)',
    },
    gold: {
        stone:    { top: '#9E9E9E', left: '#6E6E6E', right: '#838383' },
        stoneAlt: { top: '#8E8E8E', left: '#626262', right: '#787878' },
        ore:      { top: '#FFE040', left: '#C4960E', right: '#E0BE20' },
        edge: '#505050',
        glow: 'rgba(255,215,0,0.2)',
    },
    obsidian: {
        stone:    { top: '#301848', left: '#180C28', right: '#241238' },
        stoneAlt: { top: '#281240', left: '#120820', right: '#1E0E30' },
        ore:      { top: '#B040D0', left: '#701890', right: '#9028B0' },
        edge: '#401A60',
        glow: 'rgba(156,39,176,0.3)',
    },
    star: {
        stone:    { top: '#ECECEC', left: '#B0B0B0', right: '#CFCFCF' },
        stoneAlt: { top: '#E0E0E0', left: '#A4A4A4', right: '#C3C3C3' },
        ore:      { top: '#FFE880', left: '#D0A840', right: '#E8C860' },
        edge: '#909090',
        glow: 'rgba(255,255,255,0.3)',
    },
};

// Material item IDs that render as ore blocks
const ORE_ITEMS = new Set(['stone', 'iron', 'crystal', 'gold', 'obsidian', 'star']);

// ===== Render 3D Ore Block =====
function renderOreBlock(
    itemId: string,
    cx: number, cy: number, e: number,
) {
    const texture = ORE_TEXTURES[itemId];
    const colors = ORE_COLORS[itemId];
    if (!texture || !colors) return null;

    const faces: ('top' | 'left' | 'right')[] = ['left', 'right', 'top'];
    const faceGrids = { top: texture.top, left: texture.left, right: texture.right };

    const pixels: React.ReactElement[] = [];
    let key = 0;

    for (const face of faces) {
        const grid = faceGrids[face];
        for (let row = 0; row < GRID; row++) {
            for (let col = 0; col < GRID; col++) {
                const cellValue = grid[row][col];
                let color: string;
                if (cellValue === 1) {
                    color = colors.ore[face];
                } else if (cellValue === 2) {
                    color = colors.stoneAlt[face];
                } else {
                    color = colors.stone[face];
                }

                const u = col * CELL;
                const v = row * CELL;
                pixels.push(
                    <polygon
                        key={key++}
                        points={pixelPoly(face, u, v, CELL, CELL, cx, cy, e)}
                        fill={color}
                    />
                );
            }
        }
    }

    return pixels;
}

/**
 * Isometric 3D Minecraft ore block icons for material items.
 */
export function ItemIcon({ itemId, size = 20, className }: ItemIconProps) {
    const half = size / 2;

    if (ORE_ITEMS.has(itemId)) {
        const e = size * 0.44;
        const cx = half;
        const cy = half;
        const colors = ORE_COLORS[itemId];

        // Isometric cube vertices
        const top: [number, number] = [cx, cy - e];
        const topLeft: [number, number] = [cx - e * COS30, cy - e * SIN30];
        const topRight: [number, number] = [cx + e * COS30, cy - e * SIN30];
        const center: [number, number] = [cx, cy];
        const bottomLeft: [number, number] = [cx - e * COS30, cy + e * SIN30];
        const bottomRight: [number, number] = [cx + e * COS30, cy + e * SIN30];
        const bottom: [number, number] = [cx, cy + e];

        const sw = size > 16 ? 0.7 : 0.5;

        // Drop shadow color matches ore type for subtle 3D depth
        const shadowColor = colors.glow || 'rgba(0,0,0,0.3)';

        return (
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                fill="none"
                className={className}
                style={{
                    display: 'block',
                    filter: `drop-shadow(0 1px 2px ${shadowColor})`,
                    shapeRendering: 'crispEdges',
                }}
            >
                {/* Glow effect for rare+ items */}
                {colors.glow && (
                    <circle
                        cx={cx}
                        cy={cy}
                        r={e * 1.3}
                        fill={colors.glow}
                    />
                )}

                {/* Pixel-textured faces (draw order: left, right, top) */}
                {renderOreBlock(itemId, cx, cy, e)}

                {/* Edge wireframe for 3D definition */}
                <g stroke={colors.edge} strokeWidth={sw} fill="none" strokeLinejoin="round">
                    {/* Outer silhouette */}
                    <polygon points={`${top[0]},${top[1]} ${topRight[0]},${topRight[1]} ${bottomRight[0]},${bottomRight[1]} ${bottom[0]},${bottom[1]} ${bottomLeft[0]},${bottomLeft[1]} ${topLeft[0]},${topLeft[1]}`} />
                    {/* Inner edges (face boundaries) */}
                    <line x1={topLeft[0]} y1={topLeft[1]} x2={center[0]} y2={center[1]} />
                    <line x1={center[0]} y1={center[1]} x2={topRight[0]} y2={topRight[1]} />
                    <line x1={center[0]} y1={center[1]} x2={bottom[0]} y2={bottom[1]} />
                </g>

                {/* Specular highlight on top face */}
                <polygon
                    points={`${top[0]},${top[1]} ${topRight[0]},${topRight[1]} ${center[0]},${center[1]} ${topLeft[0]},${topLeft[1]}`}
                    fill="white"
                    opacity={0.08}
                />
            </svg>
        );
    }

    // Unknown item — fallback circle
    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            fill="none"
            className={className}
            style={{ display: 'block' }}
        >
            <circle cx={half} cy={half} r={half * 0.6} fill="#666" stroke="#888" strokeWidth="0.5" />
        </svg>
    );
}
