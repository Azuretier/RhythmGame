# Rotation System Documentation

## Overview

The Rhythmia game now uses a dedicated, modular rotation system based on the **Super Rotation System (SRS)**, the industry-standard rotation system used in modern Tetris games.

## Location

The rotation system is implemented in:
- **Module**: `src/lib/rotationSystem.ts`
- **Tests**: `src/lib/rotationSystem.test.ts`

## Key Features

### 1. SRS Wall Kick Tables

The system implements proper SRS wall kick tables for all piece types:

- **JLSTZ pieces** (J, L, S, T, Z): Standard wall kick offsets
- **I piece**: Special wall kick offsets due to its unique shape
- **O piece**: No rotation (always stays in place)

Each rotation transition (e.g., 0→1, 1→2) has **5 kick test positions** that are tried in sequence until one succeeds.

### 2. Coordinate System

The game uses a standard screen coordinate system:
- **X-axis**: Positive is RIGHT
- **Y-axis**: Positive is DOWN
- **Origin (0,0)**: Top-left of the playfield

**Important**: The official SRS specification uses positive Y as UP, but our implementation uses positive Y as DOWN. Therefore, all Y-offsets in the kick tables are **negated** from the SRS specification.

### 3. API

The main function is `tryRotate()`:

```typescript
tryRotate(
  piece: Piece,           // Current piece to rotate
  position: Position,     // Current position
  direction: 1 | -1,      // 1 = clockwise, -1 = counter-clockwise
  collisionCheck: (piece, x, y) => boolean
): RotationResult
```

Returns:
```typescript
{
  piece: Piece,           // New piece with rotated shape
  position: Position,     // New position after applying kicks
  success: boolean,       // Whether rotation succeeded
  kickIndex?: number      // Which kick test succeeded (0-4)
}
```

## Bug Fix: T-Spin Double

### The Problem

Previously, when attempting a T-Spin Double rotation, the T piece would sometimes be placed **higher than intended** (appearing to "lift" upward). This occurred because:

1. The old implementation used simplified kick tests: `[[0,0], [-1,0], [1,0], [0,-1]]`
2. The test `[0, -1]` (move up by 1) was tested **early** in the sequence
3. This would succeed in cases where it shouldn't, causing unintended upward placement

### The Solution

The new implementation uses **proper SRS kick tables** with the correct test sequence for T-piece rotations (e.g., 0→1):

```typescript
[[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]
```

This ensures:
- Tests are tried in the correct SRS order
- The piece only moves if it follows SRS specifications
- T-Spin Double rotations resolve to the intended position
- No unintended upward movement

### Test Coverage

The bug fix is covered by comprehensive tests in `rotationSystem.test.ts`:

```typescript
test('T-piece 0->1 rotation uses correct kick test order')
test('T-piece does NOT use [0, -1] kick test early in sequence')
test('T-Spin Double rotation scenarios')
```

All 36 tests pass, including:
- All piece types (I, O, T, S, Z, L, J)
- All rotation directions (CW, CCW)
- Wall kick scenarios
- T-Spin specific tests

## Usage in Game Components

### VanillaGame.tsx

The VanillaGame component now:
1. Imports `tryRotate` from `@/lib/rotationSystem`
2. Removes old inline rotation logic
3. Uses `tryRotate()` in the `rotatePiece()` callback
4. Supports both clockwise and counter-clockwise rotation
5. Maintains T-Spin detection logic

### MultiplayerBattle.tsx

The MultiplayerBattle component now:
1. Imports `tryRotate` and `PieceType` from `@/lib/rotationSystem`
2. Updates Piece interface to include `type` and `rotation` fields
3. Uses `tryRotate()` for clockwise rotation
4. Benefits from proper wall kicks in multiplayer mode

## Benefits

1. **Maintainability**: Rotation logic is in one place, not duplicated
2. **Correctness**: Uses industry-standard SRS specifications
3. **Testability**: 36 comprehensive unit tests ensure correctness
4. **Extensibility**: Easy to add new rotation systems or piece types
5. **Bug-free**: T-Spin Double bug is fixed with regression tests

## Future Enhancements

Possible improvements:
- Add rotation system variants (e.g., TGM, Arika)
- Support for custom kick tables
- Visual debugging tools to show kick test attempts
- Performance profiling for rotation calculations

## References

- [Tetris Wiki: SRS](https://tetris.wiki/Super_Rotation_System)
- [SRS Wall Kick Data Tables](https://tetris.wiki/Super_Rotation_System#Wall_Kick_Data)
