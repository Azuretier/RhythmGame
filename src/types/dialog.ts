// ===== Dialog & Story System Types =====

/** Character animation states triggered during dialog */
export type AnimationState =
  | 'idle'
  | 'talking'
  | 'thinking'
  | 'surprised'
  | 'wave'
  | 'happy'
  | 'sad';

/** Facial expression morph targets */
export type Expression =
  | 'neutral'
  | 'smile'
  | 'angry'
  | 'surprised'
  | 'sad'
  | 'thinking';

/** A single line of dialog with animation triggers */
export interface DialogLine {
  /** The speaker's display name */
  speaker?: string;
  /** The dialog text to display */
  text: string;
  /** Animation to trigger on the 3D character */
  animation?: AnimationState;
  /** Facial expression to set on the character */
  expression?: Expression;
  /** Typing speed in ms per character (default: 30) */
  typingSpeed?: number;
}

/** A scene containing dialog lines and character configuration */
export interface StoryScene {
  /** Unique scene identifier */
  id: string;
  /** Background image URL or CSS color */
  background?: string;
  /** Path to the character model (.glb or .gltf) */
  characterModel?: string;
  /** Character display name */
  characterName?: string;
  /** Dialog lines in this scene */
  lines: DialogLine[];
}

/** Top-level story data structure */
export interface StoryData {
  /** Story title */
  title: string;
  /** Ordered scenes */
  scenes: StoryScene[];
}
