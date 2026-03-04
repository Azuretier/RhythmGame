'use client';

// =============================================================================
// Minecraft: Nintendo Switch Edition — Mob Renderer
// =============================================================================
// Box-geometry mob models with procedural pixel-art textures. Each mob is built
// from rectangular prisms (head, body, limbs) colored per-mob-type. Supports
// idle sway, walk cycles, attack animation, hurt flash, and death fall-over.
// Designed for use with @react-three/fiber in the main game canvas.
// =============================================================================

import { useMemo, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// =============================================================================
// Types
// =============================================================================

export interface MobRenderData {
  id: string;
  type: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  maxHealth: number;
  aiState: string;
  hurtTicks: number;
  deathTicks: number;
  animation: 'idle' | 'walking' | 'attacking' | 'hurt' | 'dying';
  animationTime: number;
}

interface MobModelPart {
  name: string;
  size: [number, number, number]; // width, height, depth
  offset: [number, number, number]; // x, y, z offset from origin
  pivot: [number, number, number]; // pivot point for rotation
  color: string;
}

interface MobModel {
  parts: MobModelPart[];
  scale: number;
  eyeHeight: number;
}

// =============================================================================
// Mob Model Definitions
// =============================================================================

const MOB_MODELS: Record<string, MobModel> = {
  zombie: {
    scale: 1.0,
    eyeHeight: 1.62,
    parts: [
      { name: 'head', size: [0.5, 0.5, 0.5], offset: [0, 1.5, 0], pivot: [0, 1.5, 0], color: '#567d46' },
      { name: 'body', size: [0.5, 0.75, 0.25], offset: [0, 0.875, 0], pivot: [0, 0.875, 0], color: '#2d8049' },
      { name: 'left_arm', size: [0.25, 0.75, 0.25], offset: [-0.375, 0.875, 0], pivot: [0, 1.25, 0], color: '#567d46' },
      { name: 'right_arm', size: [0.25, 0.75, 0.25], offset: [0.375, 0.875, 0], pivot: [0, 1.25, 0], color: '#567d46' },
      { name: 'left_leg', size: [0.25, 0.75, 0.25], offset: [-0.125, 0.375, 0], pivot: [0, 0.75, 0], color: '#33478a' },
      { name: 'right_leg', size: [0.25, 0.75, 0.25], offset: [0.125, 0.375, 0], pivot: [0, 0.75, 0], color: '#33478a' },
    ],
  },

  skeleton: {
    scale: 1.0,
    eyeHeight: 1.62,
    parts: [
      { name: 'head', size: [0.5, 0.5, 0.5], offset: [0, 1.5, 0], pivot: [0, 1.5, 0], color: '#c8c8b0' },
      { name: 'body', size: [0.5, 0.75, 0.2], offset: [0, 0.875, 0], pivot: [0, 0.875, 0], color: '#b0b09c' },
      { name: 'left_arm', size: [0.15, 0.75, 0.15], offset: [-0.375, 0.875, 0], pivot: [0, 1.25, 0], color: '#c8c8b0' },
      { name: 'right_arm', size: [0.15, 0.75, 0.15], offset: [0.375, 0.875, 0], pivot: [0, 1.25, 0], color: '#c8c8b0' },
      { name: 'left_leg', size: [0.15, 0.75, 0.15], offset: [-0.125, 0.375, 0], pivot: [0, 0.75, 0], color: '#c8c8b0' },
      { name: 'right_leg', size: [0.15, 0.75, 0.15], offset: [0.125, 0.375, 0], pivot: [0, 0.75, 0], color: '#c8c8b0' },
    ],
  },

  creeper: {
    scale: 1.0,
    eyeHeight: 1.2,
    parts: [
      { name: 'head', size: [0.5, 0.5, 0.5], offset: [0, 1.25, 0], pivot: [0, 1.25, 0], color: '#4dbb4d' },
      { name: 'body', size: [0.5, 0.75, 0.25], offset: [0, 0.625, 0], pivot: [0, 0.625, 0], color: '#3ea23e' },
      { name: 'front_left_leg', size: [0.25, 0.375, 0.25], offset: [-0.125, 0.1875, 0.125], pivot: [0, 0.375, 0], color: '#3ea23e' },
      { name: 'front_right_leg', size: [0.25, 0.375, 0.25], offset: [0.125, 0.1875, 0.125], pivot: [0, 0.375, 0], color: '#3ea23e' },
      { name: 'back_left_leg', size: [0.25, 0.375, 0.25], offset: [-0.125, 0.1875, -0.125], pivot: [0, 0.375, 0], color: '#3ea23e' },
      { name: 'back_right_leg', size: [0.25, 0.375, 0.25], offset: [0.125, 0.1875, -0.125], pivot: [0, 0.375, 0], color: '#3ea23e' },
    ],
  },

  spider: {
    scale: 1.0,
    eyeHeight: 0.65,
    parts: [
      { name: 'head', size: [0.5, 0.4, 0.45], offset: [0, 0.5, 0.35], pivot: [0, 0.5, 0], color: '#443322' },
      { name: 'body', size: [0.7, 0.4, 0.7], offset: [0, 0.4, -0.15], pivot: [0, 0.4, 0], color: '#332211' },
      { name: 'left_leg_1', size: [0.6, 0.1, 0.1], offset: [-0.65, 0.35, 0.15], pivot: [-0.35, 0.4, 0], color: '#332211' },
      { name: 'right_leg_1', size: [0.6, 0.1, 0.1], offset: [0.65, 0.35, 0.15], pivot: [0.35, 0.4, 0], color: '#332211' },
      { name: 'left_leg_2', size: [0.6, 0.1, 0.1], offset: [-0.65, 0.35, 0.0], pivot: [-0.35, 0.4, 0], color: '#332211' },
      { name: 'right_leg_2', size: [0.6, 0.1, 0.1], offset: [0.65, 0.35, 0.0], pivot: [0.35, 0.4, 0], color: '#332211' },
      { name: 'left_leg_3', size: [0.6, 0.1, 0.1], offset: [-0.65, 0.35, -0.15], pivot: [-0.35, 0.4, 0], color: '#332211' },
      { name: 'right_leg_3', size: [0.6, 0.1, 0.1], offset: [0.65, 0.35, -0.15], pivot: [0.35, 0.4, 0], color: '#332211' },
    ],
  },

  enderman: {
    scale: 1.0,
    eyeHeight: 2.55,
    parts: [
      { name: 'head', size: [0.5, 0.5, 0.5], offset: [0, 2.625, 0], pivot: [0, 2.625, 0], color: '#1a1a1a' },
      { name: 'body', size: [0.4, 1.2, 0.2], offset: [0, 1.475, 0], pivot: [0, 1.475, 0], color: '#1a1a1a' },
      { name: 'left_arm', size: [0.15, 1.5, 0.15], offset: [-0.35, 1.375, 0], pivot: [0, 2.125, 0], color: '#1a1a1a' },
      { name: 'right_arm', size: [0.15, 1.5, 0.15], offset: [0.35, 1.375, 0], pivot: [0, 2.125, 0], color: '#1a1a1a' },
      { name: 'left_leg', size: [0.15, 1.5, 0.15], offset: [-0.1, 0.375, 0], pivot: [0, 0.75, 0], color: '#1a1a1a' },
      { name: 'right_leg', size: [0.15, 1.5, 0.15], offset: [0.1, 0.375, 0], pivot: [0, 0.75, 0], color: '#1a1a1a' },
    ],
  },

  cow: {
    scale: 1.0,
    eyeHeight: 1.3,
    parts: [
      { name: 'head', size: [0.5, 0.5, 0.375], offset: [0, 1.25, 0.4375], pivot: [0, 1.25, 0], color: '#66442b' },
      { name: 'body', size: [0.625, 0.625, 1.0], offset: [0, 0.8125, 0], pivot: [0, 0.8125, 0], color: '#8b6c4f' },
      { name: 'left_front_leg', size: [0.25, 0.75, 0.25], offset: [-0.1875, 0.375, 0.25], pivot: [0, 0.75, 0], color: '#66442b' },
      { name: 'right_front_leg', size: [0.25, 0.75, 0.25], offset: [0.1875, 0.375, 0.25], pivot: [0, 0.75, 0], color: '#66442b' },
      { name: 'left_back_leg', size: [0.25, 0.75, 0.25], offset: [-0.1875, 0.375, -0.25], pivot: [0, 0.75, 0], color: '#66442b' },
      { name: 'right_back_leg', size: [0.25, 0.75, 0.25], offset: [0.1875, 0.375, -0.25], pivot: [0, 0.75, 0], color: '#66442b' },
    ],
  },

  pig: {
    scale: 1.0,
    eyeHeight: 0.7,
    parts: [
      { name: 'head', size: [0.5, 0.5, 0.5], offset: [0, 0.75, 0.375], pivot: [0, 0.75, 0], color: '#e8a0a0' },
      { name: 'body', size: [0.5, 0.5, 0.75], offset: [0, 0.5, 0], pivot: [0, 0.5, 0], color: '#e89090' },
      { name: 'left_front_leg', size: [0.25, 0.375, 0.25], offset: [-0.125, 0.1875, 0.1875], pivot: [0, 0.375, 0], color: '#e89090' },
      { name: 'right_front_leg', size: [0.25, 0.375, 0.25], offset: [0.125, 0.1875, 0.1875], pivot: [0, 0.375, 0], color: '#e89090' },
      { name: 'left_back_leg', size: [0.25, 0.375, 0.25], offset: [-0.125, 0.1875, -0.1875], pivot: [0, 0.375, 0], color: '#e89090' },
      { name: 'right_back_leg', size: [0.25, 0.375, 0.25], offset: [0.125, 0.1875, -0.1875], pivot: [0, 0.375, 0], color: '#e89090' },
    ],
  },

  sheep: {
    scale: 1.0,
    eyeHeight: 1.15,
    parts: [
      { name: 'head', size: [0.375, 0.375, 0.375], offset: [0, 1.125, 0.375], pivot: [0, 1.125, 0], color: '#888888' },
      { name: 'body', size: [0.625, 0.625, 0.75], offset: [0, 0.8125, 0], pivot: [0, 0.8125, 0], color: '#dddddd' },
      { name: 'left_front_leg', size: [0.25, 0.75, 0.25], offset: [-0.1875, 0.375, 0.1875], pivot: [0, 0.75, 0], color: '#888888' },
      { name: 'right_front_leg', size: [0.25, 0.75, 0.25], offset: [0.1875, 0.375, 0.1875], pivot: [0, 0.75, 0], color: '#888888' },
      { name: 'left_back_leg', size: [0.25, 0.75, 0.25], offset: [-0.1875, 0.375, -0.1875], pivot: [0, 0.75, 0], color: '#888888' },
      { name: 'right_back_leg', size: [0.25, 0.75, 0.25], offset: [0.1875, 0.375, -0.1875], pivot: [0, 0.75, 0], color: '#888888' },
    ],
  },

  chicken: {
    scale: 0.7,
    eyeHeight: 0.55,
    parts: [
      { name: 'head', size: [0.25, 0.375, 0.25], offset: [0, 0.6875, 0.15], pivot: [0, 0.6875, 0], color: '#dddddd' },
      { name: 'beak', size: [0.15, 0.1, 0.15], offset: [0, 0.55, 0.25], pivot: [0, 0.55, 0], color: '#cc6600' },
      { name: 'wattle', size: [0.1, 0.1, 0.05], offset: [0, 0.45, 0.2], pivot: [0, 0.45, 0], color: '#cc0000' },
      { name: 'body', size: [0.375, 0.375, 0.5], offset: [0, 0.375, 0], pivot: [0, 0.375, 0], color: '#dddddd' },
      { name: 'left_leg', size: [0.1, 0.25, 0.1], offset: [-0.1, 0.125, 0], pivot: [0, 0.25, 0], color: '#cc6600' },
      { name: 'right_leg', size: [0.1, 0.25, 0.1], offset: [0.1, 0.125, 0], pivot: [0, 0.25, 0], color: '#cc6600' },
    ],
  },

  wolf: {
    scale: 0.8,
    eyeHeight: 0.65,
    parts: [
      { name: 'head', size: [0.375, 0.375, 0.375], offset: [0, 0.75, 0.35], pivot: [0, 0.75, 0], color: '#c8c0b0' },
      { name: 'body', size: [0.375, 0.375, 0.75], offset: [0, 0.5625, 0], pivot: [0, 0.5625, 0], color: '#c8c0b0' },
      { name: 'tail', size: [0.1, 0.1, 0.375], offset: [0, 0.625, -0.5], pivot: [0, 0.625, -0.375], color: '#c8c0b0' },
      { name: 'left_front_leg', size: [0.15, 0.375, 0.15], offset: [-0.125, 0.1875, 0.1875], pivot: [0, 0.375, 0], color: '#c8c0b0' },
      { name: 'right_front_leg', size: [0.15, 0.375, 0.15], offset: [0.125, 0.1875, 0.1875], pivot: [0, 0.375, 0], color: '#c8c0b0' },
      { name: 'left_back_leg', size: [0.15, 0.375, 0.15], offset: [-0.125, 0.1875, -0.1875], pivot: [0, 0.375, 0], color: '#c8c0b0' },
      { name: 'right_back_leg', size: [0.15, 0.375, 0.15], offset: [0.125, 0.1875, -0.1875], pivot: [0, 0.375, 0], color: '#c8c0b0' },
    ],
  },

  slime: {
    scale: 1.0,
    eyeHeight: 0.6,
    parts: [
      { name: 'body', size: [1.0, 1.0, 1.0], offset: [0, 0.5, 0], pivot: [0, 0.5, 0], color: '#55cc55' },
      { name: 'left_eye', size: [0.15, 0.15, 0.05], offset: [-0.15, 0.65, 0.48], pivot: [0, 0.65, 0], color: '#111111' },
      { name: 'right_eye', size: [0.15, 0.15, 0.05], offset: [0.15, 0.65, 0.48], pivot: [0, 0.65, 0], color: '#111111' },
      { name: 'mouth', size: [0.3, 0.1, 0.05], offset: [0, 0.4, 0.48], pivot: [0, 0.4, 0], color: '#111111' },
    ],
  },

  blaze: {
    scale: 1.0,
    eyeHeight: 1.5,
    parts: [
      { name: 'head', size: [0.5, 0.5, 0.5], offset: [0, 1.5, 0], pivot: [0, 1.5, 0], color: '#ffcc00' },
      { name: 'rod_1', size: [0.1, 0.6, 0.1], offset: [-0.3, 0.8, -0.3], pivot: [0, 1.1, 0], color: '#ff8800' },
      { name: 'rod_2', size: [0.1, 0.6, 0.1], offset: [0.3, 0.8, -0.3], pivot: [0, 1.1, 0], color: '#ff8800' },
      { name: 'rod_3', size: [0.1, 0.6, 0.1], offset: [-0.3, 0.8, 0.3], pivot: [0, 1.1, 0], color: '#ff8800' },
      { name: 'rod_4', size: [0.1, 0.6, 0.1], offset: [0.3, 0.8, 0.3], pivot: [0, 1.1, 0], color: '#ff8800' },
      { name: 'rod_5', size: [0.1, 0.6, 0.1], offset: [-0.3, 0.5, 0.0], pivot: [0, 0.8, 0], color: '#ff8800' },
      { name: 'rod_6', size: [0.1, 0.6, 0.1], offset: [0.3, 0.5, 0.0], pivot: [0, 0.8, 0], color: '#ff8800' },
    ],
  },

  ghast: {
    scale: 1.5,
    eyeHeight: 2.0,
    parts: [
      { name: 'body', size: [2.0, 2.0, 2.0], offset: [0, 2.0, 0], pivot: [0, 2.0, 0], color: '#eeeeee' },
      { name: 'tentacle_1', size: [0.15, 1.5, 0.15], offset: [-0.5, 0.25, -0.5], pivot: [0, 1.0, 0], color: '#cccccc' },
      { name: 'tentacle_2', size: [0.15, 1.5, 0.15], offset: [0.0, 0.25, -0.5], pivot: [0, 1.0, 0], color: '#cccccc' },
      { name: 'tentacle_3', size: [0.15, 1.5, 0.15], offset: [0.5, 0.25, -0.5], pivot: [0, 1.0, 0], color: '#cccccc' },
      { name: 'tentacle_4', size: [0.15, 1.5, 0.15], offset: [-0.5, 0.25, 0.0], pivot: [0, 1.0, 0], color: '#cccccc' },
      { name: 'tentacle_5', size: [0.15, 1.5, 0.15], offset: [0.0, 0.25, 0.0], pivot: [0, 1.0, 0], color: '#cccccc' },
      { name: 'tentacle_6', size: [0.15, 1.5, 0.15], offset: [0.5, 0.25, 0.0], pivot: [0, 1.0, 0], color: '#cccccc' },
      { name: 'tentacle_7', size: [0.15, 1.5, 0.15], offset: [-0.5, 0.25, 0.5], pivot: [0, 1.0, 0], color: '#cccccc' },
      { name: 'tentacle_8', size: [0.15, 1.5, 0.15], offset: [0.0, 0.25, 0.5], pivot: [0, 1.0, 0], color: '#cccccc' },
      { name: 'tentacle_9', size: [0.15, 1.5, 0.15], offset: [0.5, 0.25, 0.5], pivot: [0, 1.0, 0], color: '#cccccc' },
    ],
  },

  witch: {
    scale: 1.0,
    eyeHeight: 1.62,
    parts: [
      { name: 'head', size: [0.5, 0.5, 0.5], offset: [0, 1.5, 0], pivot: [0, 1.5, 0], color: '#d8c8a0' },
      { name: 'hat', size: [0.6, 0.5, 0.6], offset: [0, 1.85, 0], pivot: [0, 1.85, 0], color: '#2a0a2a' },
      { name: 'nose', size: [0.15, 0.2, 0.15], offset: [0, 1.4, 0.3], pivot: [0, 1.4, 0], color: '#70a050' },
      { name: 'body', size: [0.5, 0.75, 0.25], offset: [0, 0.875, 0], pivot: [0, 0.875, 0], color: '#5a2a5a' },
      { name: 'left_arm', size: [0.25, 0.75, 0.25], offset: [-0.375, 0.875, 0], pivot: [0, 1.25, 0], color: '#5a2a5a' },
      { name: 'right_arm', size: [0.25, 0.75, 0.25], offset: [0.375, 0.875, 0], pivot: [0, 1.25, 0], color: '#5a2a5a' },
      { name: 'left_leg', size: [0.25, 0.75, 0.25], offset: [-0.125, 0.375, 0], pivot: [0, 0.75, 0], color: '#5a2a5a' },
      { name: 'right_leg', size: [0.25, 0.75, 0.25], offset: [0.125, 0.375, 0], pivot: [0, 0.75, 0], color: '#5a2a5a' },
    ],
  },

  phantom: {
    scale: 1.0,
    eyeHeight: 0.3,
    parts: [
      { name: 'body', size: [0.5, 0.25, 0.75], offset: [0, 0.125, 0], pivot: [0, 0.125, 0], color: '#384878' },
      { name: 'head', size: [0.25, 0.25, 0.25], offset: [0, 0.125, 0.45], pivot: [0, 0.125, 0], color: '#3a5888' },
      { name: 'left_wing', size: [1.0, 0.05, 0.5], offset: [-0.75, 0.15, 0], pivot: [-0.25, 0.15, 0], color: '#405888' },
      { name: 'right_wing', size: [1.0, 0.05, 0.5], offset: [0.75, 0.15, 0], pivot: [0.25, 0.15, 0], color: '#405888' },
    ],
  },

  iron_golem: {
    scale: 1.4,
    eyeHeight: 2.3,
    parts: [
      { name: 'head', size: [0.625, 0.5, 0.625], offset: [0, 2.25, 0], pivot: [0, 2.25, 0], color: '#c8c8c0' },
      { name: 'body', size: [0.875, 1.25, 0.5], offset: [0, 1.125, 0], pivot: [0, 1.125, 0], color: '#c8c8c0' },
      { name: 'left_arm', size: [0.375, 1.5, 0.375], offset: [-0.625, 1.0, 0], pivot: [0, 1.75, 0], color: '#c8c8c0' },
      { name: 'right_arm', size: [0.375, 1.5, 0.375], offset: [0.625, 1.0, 0], pivot: [0, 1.75, 0], color: '#c8c8c0' },
      { name: 'left_leg', size: [0.375, 0.75, 0.375], offset: [-0.25, 0.375, 0], pivot: [0, 0.75, 0], color: '#c8c8c0' },
      { name: 'right_leg', size: [0.375, 0.75, 0.375], offset: [0.25, 0.375, 0], pivot: [0, 0.75, 0], color: '#c8c8c0' },
    ],
  },

  wither_skeleton: {
    scale: 1.0,
    eyeHeight: 2.0,
    parts: [
      { name: 'head', size: [0.5, 0.5, 0.5], offset: [0, 2.0, 0], pivot: [0, 2.0, 0], color: '#2a2a2a' },
      { name: 'body', size: [0.5, 0.875, 0.2], offset: [0, 1.1875, 0], pivot: [0, 1.1875, 0], color: '#2a2a2a' },
      { name: 'left_arm', size: [0.15, 0.875, 0.15], offset: [-0.375, 1.1875, 0], pivot: [0, 1.625, 0], color: '#2a2a2a' },
      { name: 'right_arm', size: [0.15, 0.875, 0.15], offset: [0.375, 1.1875, 0], pivot: [0, 1.625, 0], color: '#2a2a2a' },
      { name: 'left_leg', size: [0.15, 0.875, 0.15], offset: [-0.125, 0.4375, 0], pivot: [0, 0.875, 0], color: '#2a2a2a' },
      { name: 'right_leg', size: [0.15, 0.875, 0.15], offset: [0.125, 0.4375, 0], pivot: [0, 0.875, 0], color: '#2a2a2a' },
    ],
  },

  drowned: {
    scale: 1.0,
    eyeHeight: 1.62,
    parts: [
      { name: 'head', size: [0.5, 0.5, 0.5], offset: [0, 1.5, 0], pivot: [0, 1.5, 0], color: '#3a8080' },
      { name: 'body', size: [0.5, 0.75, 0.25], offset: [0, 0.875, 0], pivot: [0, 0.875, 0], color: '#2d6060' },
      { name: 'left_arm', size: [0.25, 0.75, 0.25], offset: [-0.375, 0.875, 0], pivot: [0, 1.25, 0], color: '#3a8080' },
      { name: 'right_arm', size: [0.25, 0.75, 0.25], offset: [0.375, 0.875, 0], pivot: [0, 1.25, 0], color: '#3a8080' },
      { name: 'left_leg', size: [0.25, 0.75, 0.25], offset: [-0.125, 0.375, 0], pivot: [0, 0.75, 0], color: '#2d6060' },
      { name: 'right_leg', size: [0.25, 0.75, 0.25], offset: [0.125, 0.375, 0], pivot: [0, 0.75, 0], color: '#2d6060' },
    ],
  },
};

// Default fallback for any unknown mob type
const DEFAULT_MOB_MODEL: MobModel = {
  scale: 1.0,
  eyeHeight: 1.0,
  parts: [
    { name: 'head', size: [0.5, 0.5, 0.5], offset: [0, 1.25, 0], pivot: [0, 1.25, 0], color: '#ff00ff' },
    { name: 'body', size: [0.5, 0.75, 0.25], offset: [0, 0.625, 0], pivot: [0, 0.625, 0], color: '#cc00cc' },
    { name: 'left_leg', size: [0.25, 0.5, 0.25], offset: [-0.125, 0.25, 0], pivot: [0, 0.5, 0], color: '#cc00cc' },
    { name: 'right_leg', size: [0.25, 0.5, 0.25], offset: [0.125, 0.25, 0], pivot: [0, 0.5, 0], color: '#cc00cc' },
  ],
};

// =============================================================================
// Helper: Get model for a mob type
// =============================================================================

function getMobModel(mobType: string): MobModel {
  return MOB_MODELS[mobType] || DEFAULT_MOB_MODEL;
}

// =============================================================================
// Animation Functions
// =============================================================================

function getWalkAnimation(time: number, partName: string): { rotX: number; rotZ: number } {
  const speed = 6.0; // Walk cycle speed
  const swing = Math.sin(time * speed) * 0.6;

  // Legs swing opposite to each other
  if (partName.includes('left_leg') || partName.includes('left_front') || partName.includes('left_back')) {
    return { rotX: swing, rotZ: 0 };
  }
  if (partName.includes('right_leg') || partName.includes('right_front') || partName.includes('right_back')) {
    return { rotX: -swing, rotZ: 0 };
  }

  // Arms swing opposite to legs
  if (partName === 'left_arm') return { rotX: -swing * 0.5, rotZ: 0 };
  if (partName === 'right_arm') return { rotX: swing * 0.5, rotZ: 0 };

  // Wing flapping for phantom
  if (partName === 'left_wing') return { rotX: 0, rotZ: Math.sin(time * 10) * 0.3 };
  if (partName === 'right_wing') return { rotX: 0, rotZ: -Math.sin(time * 10) * 0.3 };

  // Spider legs
  if (partName.includes('leg_')) return { rotX: 0, rotZ: Math.sin(time * speed + (partName.includes('left') ? 0 : Math.PI)) * 0.4 };

  // Tentacles for ghast
  if (partName.includes('tentacle')) {
    const idx = parseInt(partName.split('_')[1]) || 0;
    return { rotX: Math.sin(time * 2 + idx * 0.7) * 0.2, rotZ: 0 };
  }

  // Blaze rods rotate
  if (partName.includes('rod')) {
    const idx = parseInt(partName.split('_')[1]) || 0;
    return { rotX: 0, rotZ: Math.sin(time * 3 + idx * 1.3) * 0.15 };
  }

  // Tail for wolf
  if (partName === 'tail') return { rotX: Math.sin(time * 8) * 0.3, rotZ: 0 };

  return { rotX: 0, rotZ: 0 };
}

function getIdleAnimation(time: number, partName: string): { rotX: number; rotZ: number } {
  // Gentle idle sway
  if (partName === 'head') {
    return { rotX: Math.sin(time * 0.5) * 0.05, rotZ: Math.sin(time * 0.3) * 0.02 };
  }
  if (partName === 'body') {
    return { rotX: 0, rotZ: Math.sin(time * 0.3) * 0.01 };
  }
  // Blaze rods slowly orbit
  if (partName.includes('rod')) {
    const idx = parseInt(partName.split('_')[1]) || 0;
    return { rotX: 0, rotZ: Math.sin(time * 1.5 + idx * 1.3) * 0.1 };
  }
  // Tentacles for ghast
  if (partName.includes('tentacle')) {
    const idx = parseInt(partName.split('_')[1]) || 0;
    return { rotX: Math.sin(time * 1.5 + idx * 0.7) * 0.1, rotZ: 0 };
  }
  // Wing for phantom
  if (partName === 'left_wing') return { rotX: 0, rotZ: Math.sin(time * 4) * 0.15 };
  if (partName === 'right_wing') return { rotX: 0, rotZ: -Math.sin(time * 4) * 0.15 };

  // Tail for wolf
  if (partName === 'tail') return { rotX: Math.sin(time * 3) * 0.15, rotZ: 0 };

  return { rotX: 0, rotZ: 0 };
}

function getAttackAnimation(time: number, partName: string): { rotX: number; rotZ: number } {
  // Arm swing for attacking
  if (partName === 'right_arm') {
    const attackSwing = Math.sin(time * 12) * 1.2;
    return { rotX: -Math.abs(attackSwing), rotZ: 0 };
  }
  return getIdleAnimation(time, partName);
}

// =============================================================================
// Single Mob Component
// =============================================================================

interface MobMeshProps {
  data: MobRenderData;
}

function MobMesh({ data }: MobMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const partRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const model = useMemo(() => getMobModel(data.type), [data.type]);

  // Create materials with memoization per color
  const materials = useMemo(() => {
    const matMap = new Map<string, THREE.MeshLambertMaterial>();
    for (const part of model.parts) {
      if (!matMap.has(part.color)) {
        matMap.set(part.color, new THREE.MeshLambertMaterial({
          color: new THREE.Color(part.color),
        }));
      }
    }
    return matMap;
  }, [model.parts]);

  // Create hurt material (red flash)
  const hurtMaterial = useMemo(() => {
    return new THREE.MeshLambertMaterial({
      color: new THREE.Color('#ff3333'),
      emissive: new THREE.Color('#ff0000'),
      emissiveIntensity: 0.5,
    });
  }, []);

  // Dispose materials on unmount to prevent GPU memory leaks
  useEffect(() => {
    return () => {
      materials.forEach(mat => mat.dispose());
      hurtMaterial.dispose();
    };
  }, [materials, hurtMaterial]);

  // Animation frame update
  useFrame((_state, _delta) => {
    if (!groupRef.current) return;

    // Position and rotation
    groupRef.current.position.set(data.x, data.y, data.z);
    // Yaw is stored in degrees (see mob-ai.ts), convert to radians for Three.js
    groupRef.current.rotation.y = -data.yaw * (Math.PI / 180);

    // Death animation: fall over
    if (data.animation === 'dying') {
      const deathProgress = Math.min(data.deathTicks / 20, 1.0);
      groupRef.current.rotation.x = deathProgress * (Math.PI / 2);
      groupRef.current.position.y = data.y - deathProgress * 0.5;
      // Fade out at end
      const opacity = Math.max(0, 1.0 - (data.deathTicks - 15) / 5);
      if (data.deathTicks > 15) {
        groupRef.current.visible = opacity > 0.01;
      }
      return;
    }

    groupRef.current.rotation.x = 0;
    groupRef.current.visible = true;

    // Animate parts
    const t = data.animationTime;
    for (const part of model.parts) {
      const mesh = partRefs.current.get(part.name);
      if (!mesh) continue;

      let anim = { rotX: 0, rotZ: 0 };
      switch (data.animation) {
        case 'walking':
          anim = getWalkAnimation(t, part.name);
          break;
        case 'attacking':
          anim = getAttackAnimation(t, part.name);
          break;
        case 'idle':
        default:
          anim = getIdleAnimation(t, part.name);
          break;
      }

      mesh.rotation.x = anim.rotX;
      mesh.rotation.z = anim.rotZ;

      // Apply hurt flash
      if (data.hurtTicks > 0) {
        mesh.material = hurtMaterial;
      } else {
        const normalMat = materials.get(part.color);
        if (normalMat) mesh.material = normalMat;
      }
    }

    // Slime squash/stretch bounce animation
    if (data.type === 'slime') {
      const bounce = 1.0 + Math.sin(t * 4) * 0.15;
      groupRef.current.scale.set(
        model.scale * bounce,
        model.scale / bounce,
        model.scale * bounce,
      );
    } else {
      groupRef.current.scale.setScalar(model.scale);
    }
  });

  const setPartRef = useCallback((name: string) => (mesh: THREE.Mesh | null) => {
    if (mesh) {
      partRefs.current.set(name, mesh);
    } else {
      partRefs.current.delete(name);
    }
  }, []);

  return (
    <group ref={groupRef}>
      {model.parts.map((part) => {
        const mat = materials.get(part.color);
        return (
          <mesh
            key={part.name}
            ref={setPartRef(part.name)}
            position={[part.offset[0], part.offset[1], part.offset[2]]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[part.size[0], part.size[1], part.size[2]]} />
            {mat ? (
              <primitive object={mat} attach="material" />
            ) : (
              <meshLambertMaterial color={part.color} />
            )}
          </mesh>
        );
      })}

      {/* Health bar above mob (only when damaged) */}
      {data.health < data.maxHealth && data.health > 0 && (
        <group position={[0, model.eyeHeight + 0.3, 0]}>
          {/* Background bar */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[0.6, 0.06]} />
            <meshBasicMaterial color="#333333" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          {/* Health bar */}
          <mesh position={[(data.health / data.maxHealth - 1) * 0.3, 0, 0.001]}>
            <planeGeometry args={[0.6 * (data.health / data.maxHealth), 0.05]} />
            <meshBasicMaterial
              color={data.health / data.maxHealth > 0.5 ? '#44cc44' : data.health / data.maxHealth > 0.25 ? '#cccc44' : '#cc4444'}
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

// =============================================================================
// Main MobRenderer — renders all mobs in the scene
// =============================================================================

interface MobRendererProps {
  mobs: MobRenderData[];
  maxRenderDistance?: number;
  playerPosition?: { x: number; y: number; z: number };
}

export default function MobRenderer({
  mobs,
  maxRenderDistance = 64,
  playerPosition,
}: MobRendererProps) {
  // Filter mobs by render distance
  const visibleMobs = useMemo(() => {
    if (!playerPosition) return mobs;

    const maxDistSq = maxRenderDistance * maxRenderDistance;
    return mobs.filter((mob) => {
      const dx = mob.x - playerPosition.x;
      const dy = mob.y - playerPosition.y;
      const dz = mob.z - playerPosition.z;
      return (dx * dx + dy * dy + dz * dz) <= maxDistSq;
    });
  }, [mobs, maxRenderDistance, playerPosition]);

  return (
    <group name="mob-renderer">
      {visibleMobs.map((mob) => (
        <MobMesh key={mob.id} data={mob} />
      ))}
    </group>
  );
}

// =============================================================================
// Export utilities for external use
// =============================================================================

export { getMobModel, MOB_MODELS, DEFAULT_MOB_MODEL };
export type { MobModel, MobModelPart, MobRendererProps };
