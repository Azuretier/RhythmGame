import * as THREE from 'three';

// Unique texture slots in the atlas (order matters - matches atlas column index)
const TEXTURE_NAMES = [
    'grass_top',   // 0
    'grass_side',  // 1
    'dirt',        // 2
    'stone',       // 3
    'wood_top',    // 4
    'wood_side',   // 5
    'brick',       // 6
    'leaves',      // 7
    'water',       // 8
    'obsidian',    // 9
    'sand',        // 10
] as const;

export const TOTAL_TEXTURES = TEXTURE_NAMES.length;

// Per-face texture mapping: { top, bottom, side } → atlas index
export const BLOCK_FACE_TEXTURES: Record<string, { top: number; bottom: number; side: number }> = {
    'grass':    { top: 0,  bottom: 2, side: 1 },  // grass_top, dirt, grass_side
    'dirt':     { top: 2,  bottom: 2, side: 2 },
    'stone':    { top: 3,  bottom: 3, side: 3 },
    'wood':     { top: 4,  bottom: 4, side: 5 },  // wood_top (rings), wood_side (bark)
    'brick':    { top: 6,  bottom: 6, side: 6 },
    'leaves':   { top: 7,  bottom: 7, side: 7 },
    'water':    { top: 8,  bottom: 8, side: 8 },
    'obsidian': { top: 9,  bottom: 9, side: 9 },
    'sand':     { top: 10, bottom: 10, side: 10 },
};

// Legacy flat mapping for any code that still uses BLOCK_IDS (e.g. hotbar UI)
export const BLOCK_IDS: Record<string, number> = {
    'grass': 0,
    'dirt': 2,
    'stone': 3,
    'wood': 4,
    'brick': 6,
    'leaves': 7,
    'water': 8,
    'obsidian': 9,
    'sand': 10,
    'air': 11
};

export const TOTAL_BLOCKS = TOTAL_TEXTURES;

/**
 * Load all block texture images and compose them into a horizontal texture atlas.
 * Returns a Promise that resolves to the atlas CanvasTexture.
 */
export const createTextureAtlas = (): Promise<THREE.CanvasTexture> => {
    const resolution = 16; // Native texture resolution
    const atlasWidth = resolution * TOTAL_TEXTURES;
    const atlasHeight = resolution;

    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = atlasWidth;
        canvas.height = atlasHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            resolve(new THREE.CanvasTexture(canvas));
            return;
        }

        let loaded = 0;

        TEXTURE_NAMES.forEach((name, index) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, index * resolution, 0, resolution, resolution);
                loaded++;
                if (loaded === TOTAL_TEXTURES) {
                    const texture = new THREE.CanvasTexture(canvas);
                    // NearestFilter preserves the crisp pixel-art look
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestFilter;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    resolve(texture);
                }
            };
            img.onerror = () => {
                // Fallback: fill slot with a magenta "missing texture" pattern
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(index * resolution, 0, resolution, resolution);
                ctx.fillStyle = '#000000';
                ctx.fillRect(index * resolution, 0, resolution / 2, resolution / 2);
                ctx.fillRect(index * resolution + resolution / 2, resolution / 2, resolution / 2, resolution / 2);
                loaded++;
                if (loaded === TOTAL_TEXTURES) {
                    const texture = new THREE.CanvasTexture(canvas);
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestFilter;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    resolve(texture);
                }
            };
            img.src = `/textures/blocks/${name}.png`;
        });
    });
};
