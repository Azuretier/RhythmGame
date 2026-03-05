'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useCameraController } from '../hooks/useCameraController';

const ORBIT_SPEED = 0.005;
const PAN_SPEED = 0.01;
const ZOOM_SPEED = 0.5;
const PINCH_ZOOM_SPEED = 0.02;

/**
 * Camera controller component — lives inside the R3F Canvas.
 *
 * Controls:
 * - Right-drag / two-finger drag: orbit
 * - Scroll wheel / pinch: zoom
 * - Middle-drag: pan
 *
 * Left-click passes through to tower slot hitboxes.
 */
export function CameraController() {
    const { gl } = useThree();
    const { stateRef } = useCameraController();

    // Track drag state outside React state to avoid re-renders
    const dragRef = useRef({
        isOrbiting: false,
        isPanning: false,
        lastX: 0,
        lastY: 0,
        touchStartDist: 0,
    });

    useEffect(() => {
        const canvas = gl.domElement;

        // ===== Mouse events =====
        const onMouseDown = (e: MouseEvent) => {
            if (e.button === 2) {
                // Right-click: orbit
                dragRef.current.isOrbiting = true;
                dragRef.current.lastX = e.clientX;
                dragRef.current.lastY = e.clientY;
                e.preventDefault();
            } else if (e.button === 1) {
                // Middle-click: pan
                dragRef.current.isPanning = true;
                dragRef.current.lastX = e.clientX;
                dragRef.current.lastY = e.clientY;
                e.preventDefault();
            }
            // button === 0 (left-click) is not captured — passes through
        };

        const onMouseMove = (e: MouseEvent) => {
            const drag = dragRef.current;
            const state = stateRef.current as typeof stateRef.current & {
                applyOrbit: (dt: number, dp: number) => void;
                applyPan: (dx: number, dy: number) => void;
            };

            if (drag.isOrbiting) {
                const dx = e.clientX - drag.lastX;
                const dy = e.clientY - drag.lastY;
                drag.lastX = e.clientX;
                drag.lastY = e.clientY;
                state.applyOrbit(dx * ORBIT_SPEED, dy * ORBIT_SPEED);
            } else if (drag.isPanning) {
                const dx = e.clientX - drag.lastX;
                const dy = e.clientY - drag.lastY;
                drag.lastX = e.clientX;
                drag.lastY = e.clientY;
                state.applyPan(dx * PAN_SPEED, dy * PAN_SPEED);
            }
        };

        const onMouseUp = (e: MouseEvent) => {
            if (e.button === 2) dragRef.current.isOrbiting = false;
            if (e.button === 1) dragRef.current.isPanning = false;
        };

        const onWheel = (e: WheelEvent) => {
            const state = stateRef.current as typeof stateRef.current & {
                applyZoom: (d: number) => void;
            };
            const delta = e.deltaY > 0 ? ZOOM_SPEED : -ZOOM_SPEED;
            state.applyZoom(delta);
        };

        const onContextMenu = (e: MouseEvent) => {
            e.preventDefault(); // Prevent context menu on right-click
        };

        // ===== Touch events =====
        const getTouchDistance = (t1: Touch, t2: Touch) => {
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const onTouchStart = (e: TouchEvent) => {
            const drag = dragRef.current;
            if (e.touches.length === 2) {
                // Two-finger: orbit + pinch zoom
                drag.isOrbiting = true;
                const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                drag.lastX = mx;
                drag.lastY = my;
                drag.touchStartDist = getTouchDistance(e.touches[0], e.touches[1]);
                e.preventDefault();
            }
            // Single finger touch passes through to tower interaction
        };

        const onTouchMove = (e: TouchEvent) => {
            const drag = dragRef.current;
            const state = stateRef.current as typeof stateRef.current & {
                applyOrbit: (dt: number, dp: number) => void;
                applyZoom: (d: number) => void;
            };

            if (e.touches.length === 2 && drag.isOrbiting) {
                // Orbit from midpoint movement
                const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const dx = mx - drag.lastX;
                const dy = my - drag.lastY;
                drag.lastX = mx;
                drag.lastY = my;
                state.applyOrbit(dx * ORBIT_SPEED, dy * ORBIT_SPEED);

                // Pinch zoom
                const dist = getTouchDistance(e.touches[0], e.touches[1]);
                const pinchDelta = (drag.touchStartDist - dist) * PINCH_ZOOM_SPEED;
                drag.touchStartDist = dist;
                state.applyZoom(pinchDelta);

                e.preventDefault();
            }
        };

        const onTouchEnd = () => {
            dragRef.current.isOrbiting = false;
            dragRef.current.isPanning = false;
        };

        // Attach listeners
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('wheel', onWheel, { passive: true });
        canvas.addEventListener('contextmenu', onContextMenu);
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd);

        return () => {
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('contextmenu', onContextMenu);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
        };
    }, [gl, stateRef]);

    return null; // This component only manages camera state, no visual output
}
