import { useRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { DEFAULT_CAMERA_POSITION } from '../galaxy-shared-constants';

// ===== Camera presets =====
export const CAMERA_PRESETS = {
    isometric: { position: DEFAULT_CAMERA_POSITION, target: [0, 0, 0] as const },
    topDown:   { position: [0, 10, 0.01] as const, target: [0, 0, 0] as const },
    closeUp:   { position: [0, 3, 4] as const, target: [0, 0, 0] as const },
    cinematic: { position: [4, 3, 6] as const, target: [0, 0, 0] as const },
} as const;

export type CameraPreset = keyof typeof CAMERA_PRESETS;

// ===== Bounds =====
const MIN_ZOOM = 3;
const MAX_ZOOM = 15;
const MIN_POLAR_ANGLE = (15 * Math.PI) / 180; // 15 degrees
const MAX_POLAR_ANGLE = (80 * Math.PI) / 180; // 80 degrees
const MAX_PAN_DISTANCE = 3;

// ===== Transition =====
const TRANSITION_SPEED = 5; // ~0.5s to converge (lerp factor per second)

interface CameraState {
    position: THREE.Vector3;
    target: THREE.Vector3;
    isTransitioning: boolean;
    preset: CameraPreset;
}

export interface CameraControllerReturn {
    preset: CameraPreset;
    setPreset: (preset: CameraPreset) => void;
    resetCamera: () => void;
    stateRef: React.MutableRefObject<CameraState>;
}

/** Manages the 3D camera with preset views, smooth transitions, orbit/zoom/pan controls, and per-frame lerp updates. */
export function useCameraController(): CameraControllerReturn {
    const { camera } = useThree();

    const stateRef = useRef<CameraState>({
        position: new THREE.Vector3(...CAMERA_PRESETS.isometric.position),
        target: new THREE.Vector3(...CAMERA_PRESETS.isometric.target),
        isTransitioning: false,
        preset: 'isometric' as CameraPreset,
    });

    const goalPosition = useRef(new THREE.Vector3(...CAMERA_PRESETS.isometric.position));
    const goalTarget = useRef(new THREE.Vector3(...CAMERA_PRESETS.isometric.target));

    const setPreset = useCallback((preset: CameraPreset) => {
        const p = CAMERA_PRESETS[preset];
        goalPosition.current.set(p.position[0], p.position[1], p.position[2]);
        goalTarget.current.set(p.target[0], p.target[1], p.target[2]);
        stateRef.current.isTransitioning = true;
        stateRef.current.preset = preset;
    }, []);

    const resetCamera = useCallback(() => {
        setPreset('isometric');
    }, [setPreset]);

    // Apply orbit delta from CameraController component
    const applyOrbit = useCallback((deltaTheta: number, deltaPhi: number) => {
        const state = stateRef.current;
        const offset = goalPosition.current.clone().sub(goalTarget.current);
        const radius = offset.length();

        // Convert to spherical
        let theta = Math.atan2(offset.x, offset.z);
        let phi = Math.acos(THREE.MathUtils.clamp(offset.y / radius, -1, 1));

        theta += deltaTheta;
        phi = THREE.MathUtils.clamp(phi - deltaPhi, MIN_POLAR_ANGLE, MAX_POLAR_ANGLE);

        // Convert back to cartesian
        offset.x = radius * Math.sin(phi) * Math.sin(theta);
        offset.y = radius * Math.cos(phi);
        offset.z = radius * Math.sin(phi) * Math.cos(theta);

        goalPosition.current.copy(goalTarget.current).add(offset);
        state.isTransitioning = true;
    }, []);

    // Apply zoom delta
    const applyZoom = useCallback((delta: number) => {
        const state = stateRef.current;
        const offset = goalPosition.current.clone().sub(goalTarget.current);
        const currentDist = offset.length();
        const newDist = THREE.MathUtils.clamp(currentDist + delta, MIN_ZOOM, MAX_ZOOM);
        offset.normalize().multiplyScalar(newDist);
        goalPosition.current.copy(goalTarget.current).add(offset);
        state.isTransitioning = true;
    }, []);

    // Apply pan delta
    const applyPan = useCallback((deltaX: number, deltaY: number) => {
        const state = stateRef.current;
        // Pan in camera-local XY plane
        const forward = new THREE.Vector3().subVectors(goalTarget.current, goalPosition.current).normalize();
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        const panOffset = right.multiplyScalar(-deltaX).add(up.multiplyScalar(deltaY));
        const newTarget = goalTarget.current.clone().add(panOffset);

        // Clamp target distance from origin
        if (newTarget.length() <= MAX_PAN_DISTANCE) {
            goalTarget.current.copy(newTarget);
            goalPosition.current.add(panOffset);
        }
        state.isTransitioning = true;
    }, [camera]);

    // Frame update: lerp camera toward goal
    useFrame((_, delta) => {
        const state = stateRef.current;
        if (!state.isTransitioning) return;

        const lerpFactor = 1 - Math.exp(-TRANSITION_SPEED * delta);

        state.position.lerp(goalPosition.current, lerpFactor);
        state.target.lerp(goalTarget.current, lerpFactor);

        camera.position.copy(state.position);
        camera.lookAt(state.target);

        // Stop transitioning when close enough
        const posDist = state.position.distanceTo(goalPosition.current);
        const tgtDist = state.target.distanceTo(goalTarget.current);
        if (posDist < 0.001 && tgtDist < 0.001) {
            state.position.copy(goalPosition.current);
            state.target.copy(goalTarget.current);
            camera.position.copy(state.position);
            camera.lookAt(state.target);
            state.isTransitioning = false;
        }
    });

    // Attach methods to stateRef for CameraController to use
    // eslint-disable-next-line react-hooks/refs
    (stateRef.current as CameraState & { applyOrbit: typeof applyOrbit }).applyOrbit = applyOrbit;
    // eslint-disable-next-line react-hooks/refs
    (stateRef.current as CameraState & { applyZoom: typeof applyZoom }).applyZoom = applyZoom;
    // eslint-disable-next-line react-hooks/refs
    (stateRef.current as CameraState & { applyPan: typeof applyPan }).applyPan = applyPan;

    // eslint-disable-next-line react-hooks/refs
    return { preset: stateRef.current.preset, setPreset, resetCamera, stateRef };
}
