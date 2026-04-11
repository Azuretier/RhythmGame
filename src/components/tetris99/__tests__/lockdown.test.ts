import { describe, expect, it } from 'vitest';
import {
  createPlacementLockState,
  updatePlacementLockAfterManipulation,
  updatePlacementLockOnTouchdown,
} from '../lockdown';

const MAX_LOCK_RESETS = 15;

describe('tetris99 lockdown', () => {
  it('starts lock delay on the first grounded manipulation without spending a reset', () => {
    const result = updatePlacementLockAfterManipulation(createPlacementLockState(), true, MAX_LOCK_RESETS);

    expect(result.timerAction).toBe('start');
    expect(result.nextState).toEqual({
      movesUsed: 0,
      hasTouchedGround: true,
      lockOnNextGround: false,
    });
  });

  it('spends a reset when a grounded piece is kicked back into the air', () => {
    const result = updatePlacementLockAfterManipulation({
      movesUsed: 0,
      hasTouchedGround: true,
      lockOnNextGround: false,
    }, false, MAX_LOCK_RESETS);

    expect(result.timerAction).toBe('clear');
    expect(result.nextState).toEqual({
      movesUsed: 1,
      hasTouchedGround: true,
      lockOnNextGround: false,
    });
  });

  it('allows the fifteenth reset but marks the sixteenth action for immediate lock on the next ground touch', () => {
    const fifteenth = updatePlacementLockAfterManipulation({
      movesUsed: 14,
      hasTouchedGround: true,
      lockOnNextGround: false,
    }, false, MAX_LOCK_RESETS);

    expect(fifteenth.timerAction).toBe('clear');
    expect(fifteenth.nextState).toEqual({
      movesUsed: 15,
      hasTouchedGround: true,
      lockOnNextGround: false,
    });

    const sixteenth = updatePlacementLockAfterManipulation(fifteenth.nextState, false, MAX_LOCK_RESETS);

    expect(sixteenth.timerAction).toBe('clear');
    expect(sixteenth.nextState).toEqual({
      movesUsed: 15,
      hasTouchedGround: true,
      lockOnNextGround: true,
    });
  });

  it('locks immediately once a reset-exhausted piece touches down again', () => {
    const result = updatePlacementLockOnTouchdown({
      movesUsed: 15,
      hasTouchedGround: true,
      lockOnNextGround: true,
    });

    expect(result.shouldLockNow).toBe(true);
    expect(result.nextState).toEqual({
      movesUsed: 15,
      hasTouchedGround: true,
      lockOnNextGround: true,
    });
  });

  it('locks immediately if the sixteenth action still ends on the ground', () => {
    const result = updatePlacementLockAfterManipulation({
      movesUsed: 15,
      hasTouchedGround: true,
      lockOnNextGround: false,
    }, true, MAX_LOCK_RESETS);

    expect(result.timerAction).toBe('lock');
    expect(result.nextState).toEqual({
      movesUsed: 15,
      hasTouchedGround: true,
      lockOnNextGround: true,
    });
  });
});
