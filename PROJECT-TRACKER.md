# PROJECT TRACKER — Galaxy TD 3D Overhaul

> Auto-managed by the `/build-project` skill. Updated after each work session.

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Completed

---

## Phase 1: Layer Architecture Refactor
> Goal: Clean separation of 2D UI / 3D world / hitbox layers

- [x] **1.1** Extract 3D scene into standalone `GalaxyScene.tsx` (pure Three.js, no UI logic)
- [x] **1.2** Create `LayerManager` system — define layer constants (LAYER_3D_BG=1, LAYER_3D_INTERACTIVE=2, LAYER_UI=3, LAYER_HUD=15)
- [x] **1.3** Refactor Canvas z-index to use LayerManager instead of inline magic numbers
- [x] **1.4** Add `pointer-events` hitbox system: 3D clickable objects use invisible expanded meshes, 2D UI always receives clicks first
- [x] **1.5** Write `useLayerInteraction` hook — manages which layer captures input based on game state

## Phase 2: Movable 3D Camera
> Goal: Player-controllable camera with smooth transitions

- [x] **2.1** Create `useCameraController` hook (orbit, pan, zoom with bounds)
- [x] **2.2** Add camera presets: isometric (current), top-down, follow-enemy, cinematic
- [x] **2.3** Implement smooth camera transitions between presets (lerp position + target)
- [x] **2.4** Add mouse/touch controls: right-drag to orbit, scroll to zoom, middle-drag to pan
- [x] **2.5** Add camera bounds to prevent looking under terrain or too far away
- [x] **2.6** Keyboard shortcuts for camera presets (C to cycle, R to reset)
- [x] **2.7** Ensure camera movement doesn't interfere with tetris keyboard controls

## Phase 3: Center Terrain (Dig Phase)
> Goal: 3D destructible terrain in the center where tetris board is

- [x] **3.1** Create `CenterTerrain.tsx` — 10x20 voxel grid matching tetris board cells
- [x] **3.2** Map tetris board state to 3D blocks (filled cell = block, empty = air)
- [x] **3.3** Add block destruction animation (particles, shake) when lines are cleared
- [x] **3.4** Sync dig phase terrain with tetris piece placement in real-time
- [x] **3.5** Add depth layers (blocks stack visually, not just flat plane)
- [x] **3.6** Implement terrain material system (different block types = different textures/colors)

## Phase 4: Surrounding Tower Terrain
> Goal: Ring terrain matches tower-defense page quality

- [x] **4.1** Audit standalone `/tower-defense` page terrain and extract reusable terrain components
- [x] **4.2** Unify terrain rendering between ring and standalone TD page
- [x] **4.3** Add terrain biome system (grass, desert, snow — cosmetic variety)
- [x] **4.4** Add terrain height variation with smooth transitions (not just flat blocks)
- [x] **4.5** Improve tower platform visuals (foundation, walls, flagpoles)
- [x] **4.6** Add path decoration (road texture, directional arrows, entry/exit portals)

## Phase 5: Flexible Board UI
> Goal: Board UI adapts to camera angle and screen size

- [x] **5.1** Create `BoardOverlay` component that projects 2D tetris onto 3D space
- [x] **5.2** Add CSS transform that matches camera perspective (board follows 3D projection)
- [x] **5.3** Implement responsive layout — board size scales with viewport
- [x] **5.4** Add toggle: full 2D mode (classic) vs 3D-integrated mode
- [x] **5.5** HUD elements reflow based on camera angle (gold/lives/wave indicators)
- [x] **5.6** Touch-friendly controls for mobile (larger hitboxes, gesture support)

## Phase 6: Multiplayer Architecture
> Goal: Component architecture ready for networked play

- [x] **6.1** Extract game actions into `GameAction` type union (place_tower, upgrade, sell, line_clear, tick)
- [x] **6.2** Create `useGameActions` hook — dispatches actions locally or to network
- [x] **6.3** Create `GameStateSync` context — wraps state with network send/receive capability
- [x] **6.4** Define WebSocket protocol types in `src/types/galaxy-td-multiplayer.ts`
- [x] **6.5** Add player slots to ring (P1 controls top/bottom towers, P2 controls left/right)
- [x] **6.6** Stub `useGalaxyTDMultiplayer` hook (extends useGalaxyTD with network layer)

## Phase 7: Continuous Refactoring
> Goal: Keep codebase clean as complexity grows

- [ ] **7.1** Split `GalaxyRing3D.tsx` (1200+ lines) into sub-modules: terrain, entities, effects, scene
- [ ] **7.2** Split `tetris.tsx` main orchestrator — extract Galaxy TD integration into `useGalaxyTDIntegration` hook
- [ ] **7.3** Create shared constants file for all layer/dimension/color values
- [ ] **7.4** Add JSDoc to all public hooks and component props
- [ ] **7.5** Remove dead code paths from phase-gating cleanup

---

## Session Log

| Date | Phase | Tasks Completed | Branch | PR |
|------|-------|----------------|--------|-----|
| 2026-03-05 | P1 | 1.1-1.5 (all) | claude/project-p1-layer-architecture | #468 |
| 2026-03-05 | P2 | 2.1-2.7 (all) | claude/project-p2-movable-camera | #469 |
| 2026-03-05 | P3 | 3.1-3.6 (all) | claude/project-p3-center-terrain | #470 |
| 2026-03-05 | P4 | 4.1-4.6 (all) | claude/project-p4-tower-terrain | #471 |
| 2026-03-05 | P5 | 5.1-5.6 (all) | claude/project-p5-flexible-board-ui | #472 |
| 2026-03-05 | P6 | 6.1-6.6 (all) | claude/project-p6-multiplayer-arch | TBD |

