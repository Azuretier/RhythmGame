export type PlacementLockState = {
  movesUsed: number;
  hasTouchedGround: boolean;
  lockOnNextGround: boolean;
};

export type PlacementLockTimerAction = 'none' | 'start' | 'restart' | 'clear' | 'lock';

export function createPlacementLockState(): PlacementLockState {
  return {
    movesUsed: 0,
    hasTouchedGround: false,
    lockOnNextGround: false,
  };
}

export function updatePlacementLockAfterManipulation(
  state: PlacementLockState,
  groundedAfter: boolean,
  maxMoves: number,
): { nextState: PlacementLockState; timerAction: PlacementLockTimerAction } {
  const nextState: PlacementLockState = { ...state };

  if (!nextState.hasTouchedGround) {
    if (groundedAfter) {
      nextState.hasTouchedGround = true;
      return { nextState, timerAction: 'start' };
    }

    return { nextState, timerAction: 'none' };
  }

  if (nextState.movesUsed < maxMoves) {
    nextState.movesUsed += 1;
    return { nextState, timerAction: groundedAfter ? 'restart' : 'clear' };
  }

  nextState.lockOnNextGround = true;
  return { nextState, timerAction: groundedAfter ? 'lock' : 'clear' };
}

export function updatePlacementLockOnTouchdown(
  state: PlacementLockState,
): { nextState: PlacementLockState; shouldLockNow: boolean } {
  const nextState: PlacementLockState = {
    ...state,
    hasTouchedGround: true,
  };

  return {
    nextState,
    shouldLockNow: nextState.lockOnNextGround,
  };
}
