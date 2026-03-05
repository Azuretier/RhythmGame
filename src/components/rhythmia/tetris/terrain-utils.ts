import * as THREE from 'three';

// ===== Biome types =====
export type Biome = 'forest' | 'desert' | 'snow';

// ===== Biome color palettes =====
export interface BiomeColors {
    pathA: THREE.Color;
    pathB: THREE.Color;
    grassA: THREE.Color;
    grassB: THREE.Color;
    bufferA: THREE.Color;
    bufferB: THREE.Color;
    cornerA: THREE.Color;
    cornerB: THREE.Color;
    groundTones: string[];
    decorationColors: THREE.Color[];
}

const FOREST_COLORS: BiomeColors = {
    pathA: new THREE.Color('#c4a35a'),
    pathB: new THREE.Color('#b8944d'),
    grassA: new THREE.Color('#3a7d44'),
    grassB: new THREE.Color('#348a3e'),
    bufferA: new THREE.Color('#2e6836'),
    bufferB: new THREE.Color('#296030'),
    cornerA: new THREE.Color('#6b7280'),
    cornerB: new THREE.Color('#5f6670'),
    groundTones: ['#2a4a2a', '#1e3a1e', '#243e24', '#1a361a', '#223c22'],
    decorationColors: [
        new THREE.Color('#6b8e23'),
        new THREE.Color('#8b7355'),
        new THREE.Color('#556b2f'),
        new THREE.Color('#8fbc8f'),
    ],
};

const DESERT_COLORS: BiomeColors = {
    pathA: new THREE.Color('#a0825a'),
    pathB: new THREE.Color('#8c7045'),
    grassA: new THREE.Color('#c2a050'),
    grassB: new THREE.Color('#b89440'),
    bufferA: new THREE.Color('#a08038'),
    bufferB: new THREE.Color('#906e30'),
    cornerA: new THREE.Color('#d4822a'),
    cornerB: new THREE.Color('#c07020'),
    groundTones: ['#6b5030', '#584020', '#5e4828', '#503818', '#564425'],
    decorationColors: [
        new THREE.Color('#daa520'),
        new THREE.Color('#b8860b'),
        new THREE.Color('#cd853f'),
        new THREE.Color('#d2b48c'),
    ],
};

const SNOW_COLORS: BiomeColors = {
    pathA: new THREE.Color('#8898a8'),
    pathB: new THREE.Color('#7a8a9a'),
    grassA: new THREE.Color('#dde8f0'),
    grassB: new THREE.Color('#c8d8e8'),
    bufferA: new THREE.Color('#b0c4d8'),
    bufferB: new THREE.Color('#a0b4c8'),
    cornerA: new THREE.Color('#2a3a5a'),
    cornerB: new THREE.Color('#1e2e4e'),
    groundTones: ['#2a3a4a', '#1e2e3e', '#243444', '#1a2a3a', '#223040'],
    decorationColors: [
        new THREE.Color('#88aacc'),
        new THREE.Color('#6688aa'),
        new THREE.Color('#aaccee'),
        new THREE.Color('#7799bb'),
    ],
};

export function getBiomeColors(biome: Biome): BiomeColors {
    switch (biome) {
        case 'desert': return DESERT_COLORS;
        case 'snow': return SNOW_COLORS;
        default: return FOREST_COLORS;
    }
}

// ===== Seeded PRNG (Mulberry32) =====
export function mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ===== Simple string hash for stable random =====
export function hashString(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}
