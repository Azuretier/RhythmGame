export interface ChapterNode {
  /** Background splash art image URL */
  image_url: string;
  /** Optional speaker name displayed in the name plate */
  character_name?: string;
  /** Dialog text (supports Japanese glyphs) */
  text: string;
  /** Optional audio file URL for voice line or SFX */
  audio?: string;
  /** Transition type when this node's image appears */
  transition?: 'fade' | 'slide-left' | 'slide-right' | 'enter-zoom' | 'none';
}

export interface Chapter {
  id: string;
  title: string;
  nodes: ChapterNode[];
}

export interface ChapterPlayerProps {
  /** Chapter data to play */
  chapter: Chapter;
  /** Callback when the chapter finishes (last node advanced) */
  onComplete?: () => void;
  /** Callback to go back / exit */
  onExit?: () => void;
}
