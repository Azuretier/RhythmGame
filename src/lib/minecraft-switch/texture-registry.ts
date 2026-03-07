// =============================================================================
// Texture Registry — Barrel re-export
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================
// This file re-exports the public API from the split texture modules.
// Internal draw functions are not re-exported — they are only consumed
// by tex-atlas-assembly.ts.
// =============================================================================

export { TEX, ATLAS_SIZE, TILE, ATLAS_COLS, ATLAS_ROWS } from './tex-constants';
export type { TexIndex } from './tex-constants';
export { getTexUV } from './tex-utils';
export { createExpandedTextureAtlas } from './tex-atlas-assembly';
export { BLOCK_FACE_TEXTURES, BLOCK_TRANSPARENT, BLOCK_LIQUID } from './tex-block-faces';
