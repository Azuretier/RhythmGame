'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { InputState } from '@/types/world';

/**
 * Hook for managing keyboard and mouse input state for player controls.
 * Tracks WASD movement, QWER skills, and mouse position/buttons.
 */
export function usePlayerInput() {
  const inputRef = useRef<InputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    skillQ: false,
    skillW: false,
    skillE: false,
    skillR: false,
    interact: false,
    mouseX: 0,
    mouseY: 0,
    mouseLeft: false,
    mouseRight: false,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    
    switch (key) {
      // Movement
      case 'w':
      case 'arrowup':
        inputRef.current.forward = true;
        break;
      case 's':
      case 'arrowdown':
        inputRef.current.backward = true;
        break;
      case 'a':
      case 'arrowleft':
        inputRef.current.left = true;
        break;
      case 'd':
      case 'arrowright':
        inputRef.current.right = true;
        break;
      
      // Skills (using number keys 1-4 to avoid conflict with WASD)
      case 'q':
      case '1':
        inputRef.current.skillQ = true;
        break;
      case '2':
        inputRef.current.skillW = true;
        break;
      case 'e':
      case '3':
        inputRef.current.skillE = true;
        break;
      case 'r':
      case '4':
        inputRef.current.skillR = true;
        break;
      
      // Interaction
      case 'f':
      case ' ':
      case 'enter':
        inputRef.current.interact = true;
        e.preventDefault(); // Prevent space from scrolling
        break;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    
    switch (key) {
      // Movement
      case 'w':
      case 'arrowup':
        inputRef.current.forward = false;
        break;
      case 's':
      case 'arrowdown':
        inputRef.current.backward = false;
        break;
      case 'a':
      case 'arrowleft':
        inputRef.current.left = false;
        break;
      case 'd':
      case 'arrowright':
        inputRef.current.right = false;
        break;
      
      // Skills (using number keys 1-4 to avoid conflict with WASD)
      case 'q':
      case '1':
        inputRef.current.skillQ = false;
        break;
      case '2':
        inputRef.current.skillW = false;
        break;
      case 'e':
      case '3':
        inputRef.current.skillE = false;
        break;
      case 'r':
      case '4':
        inputRef.current.skillR = false;
        break;
      
      // Interaction
      case 'f':
      case ' ':
      case 'enter':
        inputRef.current.interact = false;
        break;
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    inputRef.current.mouseX = e.clientX;
    inputRef.current.mouseY = e.clientY;
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 0) {
      inputRef.current.mouseLeft = true;
    } else if (e.button === 2) {
      inputRef.current.mouseRight = true;
    }
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button === 0) {
      inputRef.current.mouseLeft = false;
    } else if (e.button === 2) {
      inputRef.current.mouseRight = false;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleKeyDown, handleKeyUp, handleMouseMove, handleMouseDown, handleMouseUp]);

  const getInputState = useCallback((): InputState => {
    return { ...inputRef.current };
  }, []);

  const isMoving = useCallback((): boolean => {
    return (
      inputRef.current.forward ||
      inputRef.current.backward ||
      inputRef.current.left ||
      inputRef.current.right
    );
  }, []);

  return {
    getInputState,
    isMoving,
    inputRef,
  };
}
