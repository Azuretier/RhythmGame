/**
 * Rotation System Module
 * 
 * Implements the Super Rotation System (SRS) for tetromino rotation and wall kicks.
 * 
 * Coordinate System:
 * - X-axis: Positive is RIGHT
 * - Y-axis: Positive is DOWN (standard screen coordinates)
 * - Origin (0,0) is at the top-left of the playfield
 * 
 * SRS Specification:
 * - The official SRS uses positive Y as UP, but we use positive Y as DOWN
 * - All Y-offsets in kick tables are negated from the SRS specification
 * - Each rotation transition (e.g., 0→1) has 5 kick tests tried in sequence
 * - The first successful test is used
 */

// ===== Types =====

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';
export type Rotation = 0 | 1 | 2 | 3;

// Rotation direction constants for better readability
export const CLOCKWISE = 1 as const;
export const COUNTER_CLOCKWISE = -1 as const;
export type RotationDirection = typeof CLOCKWISE | typeof COUNTER_CLOCKWISE; // 1 = CW, -1 = CCW

export interface Piece {
  shape: number[][];
  color: string;
  type: PieceType;
  rotation: Rotation;
}

export interface Position {
  x: number;
  y: number;
}

export interface RotationResult {
  piece: Piece;
  position: Position;
  success: boolean;
  kickIndex?: number; // Which kick test succeeded (0-4)
}

// ===== SRS Wall Kick Data =====

/**
 * Wall Kick Tables for J, L, S, T, Z pieces (JLSTZ)
 * 
 * Format: Key is "fromRotation->toRotation" (e.g., "0->1")
 * Value: Array of 5 [x, y] offset tests
 * 
 * Important: Y-offsets are NEGATED from official SRS spec because our coordinate
 * system has positive Y pointing DOWN, while SRS uses positive Y pointing UP.
 * 
 * Test order matters! Tests are applied in sequence until one succeeds.
 */
export const WALL_KICK_JLSTZ: Record<string, [number, number][]> = {
  '0->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1->0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1->2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3->2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

/**
 * Wall Kick Tables for I piece
 * 
 * The I piece uses different offsets due to its unique 4-block length.
 * Y-offsets are NEGATED from official SRS spec (see above explanation).
 */
export const WALL_KICK_I: Record<string, [number, number][]> = {
  '0->1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1->0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1->2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2->1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2->3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3->2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3->0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0->3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

// ===== Rotation Functions =====

/**
 * Rotate a piece shape 90° clockwise
 * Uses matrix transpose + reverse each row
 */
export function rotateShapeCW(shape: number[][]): number[][] {
  return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
}

/**
 * Rotate a piece shape 90° counter-clockwise
 * Uses matrix transpose + reverse column order
 */
export function rotateShapeCCW(shape: number[][]): number[][] {
  return shape[0].map((_, i) => shape.map(row => row[row.length - 1 - i]));
}

/**
 * Calculate the next rotation state
 */
export function getNextRotation(current: Rotation, direction: RotationDirection): Rotation {
  if (direction === 1) {
    return ((current + 1) % 4) as Rotation;
  } else {
    return ((current + 3) % 4) as Rotation;
  }
}

/**
 * Get the wall kick table for a piece type
 */
export function getKickTable(pieceType: PieceType): Record<string, [number, number][]> {
  return pieceType === 'I' ? WALL_KICK_I : WALL_KICK_JLSTZ;
}

/**
 * Get the kick test offsets for a rotation transition
 */
export function getKickTests(
  pieceType: PieceType,
  fromRotation: Rotation,
  toRotation: Rotation
): [number, number][] {
  // O piece doesn't rotate in SRS
  if (pieceType === 'O') {
    return [[0, 0]];
  }

  const kickTable = getKickTable(pieceType);
  const key = `${fromRotation}->${toRotation}`;
  
  return kickTable[key] || [[0, 0]];
}

/**
 * Main rotation function with SRS wall kick system
 * 
 * @param piece - Current piece to rotate
 * @param position - Current position of the piece
 * @param direction - Rotation direction (1 = CW, -1 = CCW)
 * @param collisionCheck - Function to check if a position is valid
 * @returns RotationResult with new piece, position, and success status
 */
export function tryRotate(
  piece: Piece,
  position: Position,
  direction: RotationDirection,
  collisionCheck: (piece: Piece, x: number, y: number) => boolean
): RotationResult {
  // Calculate target rotation state and shape
  const targetRotation = getNextRotation(piece.rotation, direction);
  const rotatedShape = direction === 1 
    ? rotateShapeCW(piece.shape) 
    : rotateShapeCCW(piece.shape);

  const rotatedPiece: Piece = {
    ...piece,
    shape: rotatedShape,
    rotation: targetRotation,
  };

  // Get kick tests for this rotation transition
  const kickTests = getKickTests(piece.type, piece.rotation, targetRotation);

  // Try each kick test in order
  for (let i = 0; i < kickTests.length; i++) {
    const [offsetX, offsetY] = kickTests[i];
    const testX = position.x + offsetX;
    const testY = position.y + offsetY;

    // Check if this position is valid (no collision)
    if (!collisionCheck(rotatedPiece, testX, testY)) {
      return {
        piece: rotatedPiece,
        position: { x: testX, y: testY },
        success: true,
        kickIndex: i,
      };
    }
  }

  // All kick tests failed
  return {
    piece,
    position,
    success: false,
  };
}
