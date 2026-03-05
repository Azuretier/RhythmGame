/**
 * Layer z-index constants for the Rhythmia game UI stack.
 *
 * Layer hierarchy (back to front):
 * - Background (0): world backgrounds, decorative elements
 * - 3D Ring (1-4): Galaxy TD ring canvas
 * - Game UI (3): core game elements (board, sidebars, displays)
 * - HUD Overlays (10-20): wave labels, score displays, combo indicators
 * - Galaxy TD Panel (15): tower selection UI
 * - Effects (50): reaction banners, rhythm VFX, particles
 * - Panels (80-100): stat panels, progress bars
 * - Overlays (150-250): elemental HUD, phase indicators, action toasts
 * - Menus (200-300): pause menu, settings, card select
 * - Modals (500): full-screen modals, treasure boxes
 * - Tooltips (9999-10000): item tooltips, treasure UI
 */

// 3D Canvas layers
export const LAYER_3D_BACKGROUND = 1;
export const LAYER_3D_DEFAULT = 2;
export const LAYER_GAME_UI = 3;
export const LAYER_3D_INTERACTIVE = 4;

// HUD overlays
export const LAYER_HUD_LABEL = 10;
export const LAYER_TD_PANEL = 15;
export const LAYER_HUD_EXTRA = 20;

// Effects
export const LAYER_EFFECTS = 50;

// Panels
export const LAYER_PANEL = 80;
export const LAYER_PANEL_HIGH = 90;
export const LAYER_PANEL_TOP = 100;

// Overlays
export const LAYER_OVERLAY = 150;
export const LAYER_OVERLAY_BEHIND = 199;
export const LAYER_OVERLAY_MENU = 200;
export const LAYER_OVERLAY_HIGH = 250;

// Menus
export const LAYER_MENU = 300;

// Modals
export const LAYER_MODAL = 500;

// Tooltips (always on top)
export const LAYER_TOOLTIP = 9999;
export const LAYER_TOOLTIP_TOP = 10000;
