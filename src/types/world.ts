import type { StoryScene } from './dialog';

// ===== World Exploration System Types =====

/** 3D position in world space */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/** 2D position (for grid/map coordinates) */
export interface Vector2 {
  x: number;
  z: number;
}

/** Player movement state */
export interface MovementState {
  /** Current position */
  position: Vector3;
  /** Current rotation (radians) */
  rotation: number;
  /** Current velocity */
  velocity: Vector3;
  /** Is player currently moving */
  isMoving: boolean;
  /** Movement direction (normalized) */
  direction: Vector2;
}

/** Interactable story point in the world */
export interface StoryPoint {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Position in world */
  position: Vector3;
  /** Dialog scene to trigger */
  scene: StoryScene;
  /** Interaction radius (units) */
  interactionRadius: number;
  /** Whether this point has been completed */
  isCompleted: boolean;
  /** Whether this point is currently unlocked/accessible */
  isUnlocked: boolean;
  /** Required story points to unlock this one */
  prerequisites?: string[];
  /** Icon/marker type */
  markerType?: 'quest' | 'npc' | 'lore' | 'boss' | 'checkpoint';
  /** Marker color */
  markerColor?: string;
}

/** World map area/zone */
export interface WorldZone {
  /** Zone identifier */
  id: string;
  /** Zone name */
  name: string;
  /** Zone description */
  description?: string;
  /** Bounding box */
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  /** Background music track */
  music?: string;
  /** Environmental effects */
  weather?: 'clear' | 'rain' | 'snow' | 'fog';
  /** Story points in this zone */
  storyPoints: StoryPoint[];
}

/** Complete world data */
export interface WorldData {
  /** World title */
  title: string;
  /** All zones in the world */
  zones: WorldZone[];
  /** Player spawn position */
  spawnPosition: Vector3;
}

/** Player progress in the world */
export interface WorldProgress {
  /** Current zone ID */
  currentZone: string;
  /** Completed story point IDs */
  completedStories: string[];
  /** Player position (for save/load) */
  lastPosition: Vector3;
  /** Timestamp of last save */
  lastSaved: number;
}

/** Input state for player controls */
export interface InputState {
  /** Movement keys (WASD) */
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  /** Skill keys */
  skillQ: boolean;
  skillW: boolean;
  skillE: boolean;
  skillR: boolean;
  /** Interaction key */
  interact: boolean;
  /** Mouse position (for targeting) */
  mouseX: number;
  mouseY: number;
  /** Mouse button states */
  mouseLeft: boolean;
  mouseRight: boolean;
}
